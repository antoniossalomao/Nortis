"use strict";

const crypto = require("crypto");

function publicId(prefix) {
  return `${prefix}-${crypto.randomBytes(12).toString("hex")}`;
}

function limitText(value, max) {
  return [...value].slice(0, max).join("");
}

function requireText(data, key, max = 120) {
  const raw = data ? data[key] : undefined;
  if (typeof raw !== "string") {
    throw new Error(`O campo ${key} deve conter texto.`);
  }
  const value = raw.trim();
  if (value === "") {
    throw new Error(`O campo ${key} é obrigatório.`);
  }
  return limitText(value, max);
}

function requireDate(data, key) {
  const value = requireText(data, key, 100);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`O campo ${key} deve conter uma data válida.`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  // Date.UTC silently rolls over invalid calendar dates (e.g. Feb 30 -> Mar 2);
  // round-tripping the components catches that instead of accepting a nonexistent date.
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`O campo ${key} deve conter uma data válida.`);
  }
  return value;
}

function cents(value, field = "amount", allowZero = false) {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (typeof numeric !== "number" || !Number.isFinite(numeric)) {
    throw new Error(`O campo ${field} deve ser numérico.`);
  }
  if (numeric < 0) {
    throw new Error(`O campo ${field} esta fora do limite permitido.`);
  }
  const result = Math.round(numeric * 100);
  if (result < 0 || (!allowZero && result === 0)) {
    throw new Error(`O campo ${field} deve ser maior que zero.`);
  }
  return result;
}

function transactionKind(value) {
  if (value === "receita" || value === "income") return "income";
  if (value === "gasto" || value === "expense") return "expense";
  throw new Error("Tipo de lançamento inválido.");
}

/** Creates the finance API bound to one open better-sqlite3 database. */
function createFinanceApi(db) {
  function categoryId(userId, name, kind) {
    const categoryKind = kind === "income" ? "income" : "expense";
    const select = db.prepare(
      "SELECT id FROM categories WHERE user_id = ? AND name = ? AND kind IN (?, 'both') AND is_archived = 0 LIMIT 1"
    );
    const existing = select.get(userId, name, categoryKind);
    if (existing) return existing.id;

    // A concurrent call could have inserted the same category between the SELECT above and here;
    // UNIQUE(user_id, name, kind) makes that safe to ignore and re-select instead of failing.
    const insert = db.prepare(
      "INSERT OR IGNORE INTO categories (public_id, user_id, name, kind) VALUES (?, ?, ?, ?)"
    );
    const result = insert.run(publicId("cat"), userId, limitText(name || "Outros", 80), categoryKind);
    if (result.changes > 0) return result.lastInsertRowid;

    return select.get(userId, name, categoryKind).id;
  }

  function defaultAccountId(userId) {
    const existing = db
      .prepare("SELECT id FROM accounts WHERE user_id = ? AND is_archived = 0 ORDER BY id LIMIT 1")
      .get(userId);
    if (existing) return existing.id;

    const result = db
      .prepare("INSERT INTO accounts (public_id, user_id, name, type) VALUES (?, ?, ?, ?)")
      .run(publicId("acc"), userId, "Conta principal", "checking");
    return result.lastInsertRowid;
  }

  function ensureExists(userId, table, id) {
    if (table !== "transactions" && table !== "goals") {
      throw new Error("Tabela não permitida.");
    }
    const extra = table === "transactions" ? "deleted_at IS NULL" : "archived_at IS NULL";
    const row = db.prepare(`SELECT id FROM ${table} WHERE public_id = ? AND user_id = ? AND ${extra}`).get(id, userId);
    if (!row) {
      throw new Error(table === "goals" ? "Meta não encontrada." : "Lançamento não encontrado.");
    }
    return row.id;
  }

  function audit(userId, entity, id, action, changes = null) {
    db.prepare(
      "INSERT INTO audit_log (user_id, entity_type, entity_public_id, action, changes_json) VALUES (?, ?, ?, ?, ?)"
    ).run(userId, entity, id, action, changes === null ? null : JSON.stringify(changes));
  }

  function bootstrap(userId) {
    const transactions = db
      .prepare(
        `SELECT t.public_id AS id,
                CASE t.kind WHEN 'income' THEN 'receita' ELSE 'gasto' END AS type,
                t.description AS description,
                t.amount_cents,
                t.occurred_on AS date,
                COALESCE(c.name, 'Outros') AS category
         FROM transactions t
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE t.user_id = ? AND t.deleted_at IS NULL AND t.kind IN ('income', 'expense')
         ORDER BY t.occurred_on DESC, t.id DESC`
      )
      .all(userId);

    const goals = db
      .prepare(
        `SELECT g.public_id AS id, g.name, g.target_cents,
                COALESCE(SUM(gc.amount_cents), 0) AS current_cents,
                g.target_date
         FROM goals g
         LEFT JOIN goal_contributions gc ON gc.goal_id = g.id
         WHERE g.user_id = ? AND g.archived_at IS NULL
         GROUP BY g.id
         ORDER BY g.created_at, g.id`
      )
      .all(userId);

    const categories = db
      .prepare(
        `SELECT CASE kind WHEN 'income' THEN 'receita' ELSE 'gasto' END AS type, name, color
         FROM categories
         WHERE user_id = ? AND is_archived = 0 AND kind IN ('income', 'expense')
         ORDER BY kind DESC, sort_order, name`
      )
      .all(userId);

    return {
      transactions: transactions.map((row) => ({
        id: row.id,
        type: row.type,
        desc: row.description,
        amount: row.amount_cents / 100,
        category: row.category,
        date: row.date,
      })),
      goals: goals.map((row) => ({
        id: row.id,
        name: row.name,
        target: row.target_cents / 100,
        current: row.current_cents / 100,
        targetDate: row.target_date,
      })),
      categories,
    };
  }

  function findTransaction(userId, id) {
    const row = db
      .prepare(
        `SELECT t.public_id AS id, CASE t.kind WHEN 'income' THEN 'receita' ELSE 'gasto' END AS type,
                t.description AS desc, t.amount_cents, t.occurred_on AS date, COALESCE(c.name, 'Outros') AS category
         FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
         WHERE t.public_id = ? AND t.user_id = ? AND t.deleted_at IS NULL`
      )
      .get(id, userId);
    if (!row) throw new Error("Lançamento não encontrado.");
    return {
      id: row.id,
      type: row.type,
      desc: row.desc,
      category: row.category,
      date: row.date,
      amount: row.amount_cents / 100,
    };
  }

  function createTransaction(userId, data) {
    return db.transaction(() => {
      const id = publicId("tx");
      const kind = transactionKind(data.type);
      const category = categoryId(userId, requireText(data, "category", 80), kind);
      const account = defaultAccountId(userId);
      db.prepare(
        "INSERT INTO transactions (public_id, user_id, account_id, category_id, kind, description, amount_cents, occurred_on) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(id, userId, account, category, kind, requireText(data, "desc", 80), cents(data.amount), requireDate(data, "date"));
      audit(userId, "transaction", id, "created", data);
      return findTransaction(userId, id);
    })();
  }

  function updateTransaction(userId, id, data) {
    return db.transaction(() => {
      ensureExists(userId, "transactions", id);
      const kind = transactionKind(data.type);
      const category = categoryId(userId, requireText(data, "category", 80), kind);
      db.prepare(
        "UPDATE transactions SET category_id = ?, kind = ?, description = ?, amount_cents = ?, occurred_on = ?, updated_at = CURRENT_TIMESTAMP WHERE public_id = ? AND user_id = ? AND deleted_at IS NULL"
      ).run(category, kind, requireText(data, "desc", 80), cents(data.amount), requireDate(data, "date"), id, userId);
      audit(userId, "transaction", id, "updated", data);
      return findTransaction(userId, id);
    })();
  }

  function deleteTransaction(userId, id) {
    return db.transaction(() => {
      ensureExists(userId, "transactions", id);
      db.prepare(
        "UPDATE transactions SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE public_id = ? AND user_id = ?"
      ).run(id, userId);
      audit(userId, "transaction", id, "deleted");
    })();
  }

  function findGoal(userId, id) {
    const row = db
      .prepare(
        `SELECT g.public_id AS id, g.name, g.target_cents, COALESCE(SUM(gc.amount_cents), 0) AS current_cents
         FROM goals g LEFT JOIN goal_contributions gc ON gc.goal_id = g.id
         WHERE g.public_id = ? AND g.user_id = ? AND g.archived_at IS NULL GROUP BY g.id`
      )
      .get(id, userId);
    if (!row) throw new Error("Meta não encontrada.");
    return { id: row.id, name: row.name, target: row.target_cents / 100, current: row.current_cents / 100 };
  }

  function createGoal(userId, data) {
    return db.transaction(() => {
      const id = publicId("goal");
      const target = cents(data.target, "target");
      const initial = cents(data.current ?? 0, "current", true);
      const result = db
        .prepare("INSERT INTO goals (public_id, user_id, name, target_cents) VALUES (?, ?, ?, ?)")
        .run(id, userId, requireText(data, "name", 80), target);
      if (initial > 0) {
        db.prepare(
          "INSERT INTO goal_contributions (public_id, goal_id, amount_cents, contributed_on, notes) VALUES (?, ?, ?, ?, ?)"
        ).run(publicId("contrib"), result.lastInsertRowid, initial, new Date().toISOString().slice(0, 10), "Saldo inicial");
      }
      audit(userId, "goal", id, "created", data);
      return findGoal(userId, id);
    })();
  }

  function updateGoal(userId, id, data) {
    return db.transaction(() => {
      ensureExists(userId, "goals", id);
      db.prepare(
        "UPDATE goals SET name = ?, target_cents = ?, updated_at = CURRENT_TIMESTAMP WHERE public_id = ? AND user_id = ? AND archived_at IS NULL"
      ).run(requireText(data, "name", 80), cents(data.target, "target"), id, userId);
      audit(userId, "goal", id, "updated", data);
      return findGoal(userId, id);
    })();
  }

  function deleteGoal(userId, id) {
    return db.transaction(() => {
      ensureExists(userId, "goals", id);
      db.prepare(
        "UPDATE goals SET archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE public_id = ? AND user_id = ?"
      ).run(id, userId);
      audit(userId, "goal", id, "deleted");
    })();
  }

  function addGoalContribution(userId, id, data) {
    return db.transaction(() => {
      const goalId = ensureExists(userId, "goals", id);
      const amount = cents(data.amount);
      const date = data.date ? requireDate(data, "date") : new Date().toISOString().slice(0, 10);
      if (data.notes !== undefined && typeof data.notes !== "string") {
        throw new Error("O campo notes deve conter texto.");
      }
      db.prepare(
        "INSERT INTO goal_contributions (public_id, goal_id, amount_cents, contributed_on, notes) VALUES (?, ?, ?, ?, ?)"
      ).run(publicId("contrib"), goalId, amount, date, data.notes !== undefined ? limitText(data.notes.trim(), 300) : null);
      audit(userId, "goal", id, "contribution_added", { amount: amount / 100 });
      return findGoal(userId, id);
    })();
  }

  function importBackup(userId, data) {
    const transactions = data.transactions;
    const goals = data.goals;
    if (!Array.isArray(transactions) || !Array.isArray(goals)) {
      throw new Error("O backup deve conter listas de lançamentos e metas.");
    }
    if (transactions.length > 100000 || goals.length > 10000) {
      throw new Error("O backup excede o limite permitido.");
    }
    if ((data.format !== undefined && data.format !== "nortis-backup") || (data.version !== undefined && data.version !== 1)) {
      throw new Error("Formato ou versao de backup nao suportado.");
    }
    if (data.replace !== undefined && typeof data.replace !== "boolean") {
      throw new Error("O campo replace deve ser booleano.");
    }

    // Validate every row before entering the destructive replacement transaction.
    for (const [collection, items] of [["transactions", transactions], ["goals", goals]]) {
      const seen = new Set();
      for (const item of items) {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          throw new Error("O backup contem um registro invalido.");
        }
        if (item.id !== undefined) {
          const id = requireText(item, "id", 255);
          if (id !== item.id || id.length > 255 || seen.has(id)) {
            throw new Error("O backup contem um identificador invalido ou duplicado.");
          }
          seen.add(id);
        }
        if (collection === "transactions") {
          transactionKind(item.type);
          requireText(item, "desc", 80);
          requireText(item, "category", 80);
          cents(item.amount);
          requireDate(item, "date");
        } else {
          requireText(item, "name", 80);
          cents(item.target, "target");
          cents(item.current ?? 0, "current", true);
        }
      }
    }

    return db.transaction(() => {
      const replace = data.replace === true;
      const account = defaultAccountId(userId);

      if (replace) {
        db.prepare("DELETE FROM goal_contributions WHERE goal_id IN (SELECT id FROM goals WHERE user_id = ?)").run(userId);
        db.prepare("DELETE FROM goals WHERE user_id = ?").run(userId);
        db.prepare("DELETE FROM transactions WHERE user_id = ?").run(userId);
      }

      const insertTx = db.prepare(
        "INSERT OR IGNORE INTO transactions (public_id, user_id, account_id, category_id, kind, description, amount_cents, occurred_on) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      );
      for (const item of transactions) {
        const kind = transactionKind(item.type);
        const category = categoryId(userId, requireText(item, "category", 80), kind);
        const id = String(item.id || "").trim() || publicId("tx");
        insertTx.run(id, userId, account, category, kind, requireText(item, "desc", 80), cents(item.amount), requireDate(item, "date"));
      }

      const insertGoal = db.prepare("INSERT OR IGNORE INTO goals (public_id, user_id, name, target_cents) VALUES (?, ?, ?, ?)");
      const insertContribution = db.prepare(
        "INSERT OR IGNORE INTO goal_contributions (public_id, goal_id, amount_cents, contributed_on, notes) VALUES (?, ?, ?, ?, ?)"
      );
      for (const item of goals) {
        const id = String(item.id || "").trim() || publicId("goal");
        const result = insertGoal.run(id, userId, requireText(item, "name", 80), cents(item.target, "target"));
        // Existing goals already contain their contributions; merging must not add the total again.
        if (result.changes === 0) continue;
        const goalRow = db.prepare("SELECT id FROM goals WHERE public_id = ? AND user_id = ?").get(id, userId);
        const current = cents(item.current ?? 0, "current", true);
        if (goalRow && current > 0) {
          insertContribution.run(`import-contrib-${id}`, goalRow.id, current, new Date().toISOString().slice(0, 10), "Importado do backup");
        }
      }

      audit(userId, "backup", publicId("import"), "imported", {
        transactions: transactions.length,
        goals: goals.length,
        replace,
      });

      return bootstrap(userId);
    })();
  }

  function exportBackup(userId) {
    return {
      ...bootstrap(userId),
      format: "nortis-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
    };
  }

  return {
    bootstrap,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    createGoal,
    updateGoal,
    deleteGoal,
    addGoalContribution,
    importBackup,
    exportBackup,
  };
}

module.exports = { createFinanceApi };

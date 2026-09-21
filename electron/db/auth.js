"use strict";

const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCK_MINUTES = 15;

const DEFAULT_CATEGORIES = [
  ["income-salary", "Salário", "income", "#34d399", 10],
  ["income-internship", "Estágio", "income", "#5eead4", 20],
  ["income-freelance", "Freelance", "income", "#4d7fff", 30],
  ["income-other", "Outros", "income", "#60a5fa", 40],
  ["expense-home", "Moradia", "expense", "#4d7fff", 10],
  ["expense-food", "Alimentação", "expense", "#5eead4", 20],
  ["expense-transport", "Transporte", "expense", "#a78bfa", 30],
  ["expense-leisure", "Lazer", "expense", "#f472b6", 40],
  ["expense-health", "Saúde", "expense", "#fbbf24", 50],
  ["expense-education", "Educação", "expense", "#34d399", 60],
  ["expense-subscriptions", "Assinaturas", "expense", "#fb7185", 70],
  ["expense-other", "Outros", "expense", "#60a5fa", 80],
];

function publicId(prefix) {
  return `${prefix}-${crypto.randomBytes(12).toString("hex")}`;
}

function requireEmail(data, key) {
  const value = String((data && data[key]) || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error("Informe um e-mail válido.");
  }
  return value;
}

function requireText(data, key, max) {
  const raw = data ? data[key] : undefined;
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new Error(`O campo ${key} é obrigatório.`);
  }
  return raw.trim().slice(0, max);
}

/** Creates the auth API bound to one open better-sqlite3 database. */
function createAuthApi(db) {
  function claimSeedUser(name, email, hash) {
    const hasClaimedUser = db.prepare("SELECT COUNT(*) AS n FROM users WHERE email IS NOT NULL").get().n;
    if (hasClaimedUser > 0) return null;
    const seed = db.prepare("SELECT id FROM users WHERE id = 1 AND public_id = 'local-user' AND email IS NULL").get();
    if (!seed) return null;
    db.prepare("UPDATE users SET name = ?, email = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
      name,
      email,
      hash,
      seed.id
    );
    return seed.id;
  }

  function createUser(name, email, hash) {
    const result = db
      .prepare("INSERT INTO users (public_id, name, email, password_hash) VALUES (?, ?, ?, ?)")
      .run(publicId("user"), name, email, hash);
    const userId = result.lastInsertRowid;

    db.prepare("INSERT INTO accounts (public_id, user_id, name, type) VALUES (?, ?, ?, ?)").run(
      publicId("acc"),
      userId,
      "Conta principal",
      "checking"
    );

    const insertCategory = db.prepare(
      "INSERT INTO categories (public_id, user_id, name, kind, color, sort_order, is_system) VALUES (?, ?, ?, ?, ?, ?, 1)"
    );
    for (const [slug, name_, kind, color, order] of DEFAULT_CATEGORIES) {
      insertCategory.run(`${publicId("cat")}-${slug}`, userId, name_, kind, color, order);
    }

    return userId;
  }

  /** Registers a user, claiming the pre-seeded local user on the first-ever registration. Returns the user id. */
  function register(data) {
    const name = requireText(data, "name", 120);
    const email = requireEmail(data, "email");
    const password = String(data.password || "");
    if (password.length < 8) {
      throw new Error("A senha deve ter ao menos 8 caracteres.");
    }
    const hash = bcrypt.hashSync(password, 10);

    return db.transaction(() => {
      const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
      if (existing) {
        throw new Error("E-mail já cadastrado.");
      }
      return claimSeedUser(name, email, hash) ?? createUser(name, email, hash);
    })();
  }

  /** Verifies credentials, applying incremental lockout after repeated failures. Returns the user id. */
  function login(data) {
    const email = requireEmail(data, "email");
    const password = String(data.password || "");
    if (password === "") {
      throw new Error("Informe a senha.");
    }

    const user = db
      .prepare("SELECT id, password_hash, failed_login_attempts, locked_until FROM users WHERE email = ? AND deleted_at IS NULL")
      .get(email);
    if (!user || !user.password_hash) {
      throw new Error("E-mail ou senha inválidos.");
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const error = new Error("Conta temporariamente bloqueada por excesso de tentativas. Tente novamente mais tarde.");
      error.code = "ACCOUNT_LOCKED";
      throw error;
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
      const attempts = user.failed_login_attempts + 1;
      const locked = attempts >= LOGIN_MAX_ATTEMPTS;
      const lockUntil = locked ? new Date(Date.now() + LOGIN_LOCK_MINUTES * 60000).toISOString() : null;
      db.prepare("UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?").run(
        locked ? 0 : attempts,
        lockUntil,
        user.id
      );
      throw new Error("E-mail ou senha inválidos.");
    }

    db.prepare("UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?").run(user.id);
    return user.id;
  }

  return { register, login };
}

module.exports = { createAuthApi };

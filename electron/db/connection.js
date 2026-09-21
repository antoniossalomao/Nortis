"use strict";

const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

/** better-sqlite3-style `db.transaction(fn)` polyfill: node:sqlite has no built-in equivalent. */
function attachTransactionHelper(db) {
  db.transaction = (fn) => (...args) => {
    db.exec("BEGIN");
    try {
      const result = fn(...args);
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  };
}

function listMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql") || name.endsWith(".js"))
    .sort();
}

function migrate(db) {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
  const hasMigration = db.prepare("SELECT 1 FROM schema_migrations WHERE version = ?");
  const recordMigration = db.prepare("INSERT INTO schema_migrations (version) VALUES (?)");

  for (const file of listMigrationFiles()) {
    const version = path.basename(file, path.extname(file));
    if (hasMigration.get(version)) continue;

    const fullPath = path.join(MIGRATIONS_DIR, file);
    const runMigration = db.transaction(() => {
      if (file.endsWith(".js")) {
        require(fullPath)(db);
      } else {
        db.exec(fs.readFileSync(fullPath, "utf8"));
      }
      recordMigration.run(version);
    });
    runMigration();
  }
}

/** Opens (creating if needed) the SQLite database at dbPath and applies pending migrations. */
function openDatabase(dbPath) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA busy_timeout = 5000");
  attachTransactionHelper(db);

  migrate(db);
  return db;
}

module.exports = { openDatabase };

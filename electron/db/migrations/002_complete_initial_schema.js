"use strict";

// Repairs databases created by either early variant of migration 001.
module.exports = function (db) {
  const columns = db.prepare("PRAGMA table_info(transactions)").all().map((row) => row.name);
  if (!columns.includes("credit_card_statement_id")) {
    db.exec("ALTER TABLE transactions ADD COLUMN credit_card_statement_id INTEGER REFERENCES credit_card_statements(id) ON DELETE SET NULL");
  }
  db.exec(`
CREATE TABLE IF NOT EXISTS credit_card_statements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    credit_card_id INTEGER NOT NULL,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    closes_on TEXT,
    due_on TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','paid','overdue')),
    total_cents INTEGER NOT NULL DEFAULT 0,
    paid_cents INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (credit_card_id, period_start, period_end),
    FOREIGN KEY (credit_card_id) REFERENCES credit_cards(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transaction_splits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    category_id INTEGER,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    description TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS balance_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    balance_cents INTEGER NOT NULL,
    captured_on TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (account_id, captured_on),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS import_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    source TEXT NOT NULL,
    original_file_name TEXT,
    checksum_sha256 TEXT,
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','completed','failed','reverted')),
    imported_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS imported_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    import_batch_id INTEGER NOT NULL,
    transaction_id INTEGER,
    external_id TEXT,
    fingerprint TEXT NOT NULL,
    raw_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (import_batch_id, fingerprint),
    FOREIGN KEY (import_batch_id) REFERENCES import_batches(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_entity_type TEXT,
    related_entity_public_id TEXT,
    scheduled_for TEXT,
    read_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_transactions_statement ON transactions(credit_card_statement_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transaction_splits_transaction ON transaction_splits(transaction_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_at, scheduled_for);
`);
};

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT,
    locale TEXT NOT NULL DEFAULT 'pt-BR',
    timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    base_currency TEXT NOT NULL DEFAULT 'BRL',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, setting_key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'checking' CHECK (type IN ('cash','checking','savings','investment','wallet','other')),
    currency TEXT NOT NULL DEFAULT 'BRL',
    opening_balance_cents INTEGER NOT NULL DEFAULT 0,
    institution TEXT,
    color TEXT,
    is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0,1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS credit_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    account_id INTEGER,
    name TEXT NOT NULL,
    brand TEXT,
    last_four TEXT CHECK (last_four IS NULL OR length(last_four) = 4),
    credit_limit_cents INTEGER CHECK (credit_limit_cents IS NULL OR credit_limit_cents >= 0),
    closing_day INTEGER CHECK (closing_day BETWEEN 1 AND 31),
    due_day INTEGER CHECK (due_day BETWEEN 1 AND 31),
    color TEXT,
    is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0,1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    parent_id INTEGER,
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('income','expense','both')),
    icon TEXT,
    color TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0,1)),
    is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0,1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, name, kind),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, name),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recurrence_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly','yearly')),
    interval_count INTEGER NOT NULL DEFAULT 1 CHECK (interval_count > 0),
    starts_on TEXT NOT NULL,
    ends_on TEXT,
    next_run_on TEXT,
    day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
    weekday INTEGER CHECK (weekday BETWEEN 0 AND 6),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    account_id INTEGER NOT NULL,
    destination_account_id INTEGER,
    credit_card_id INTEGER,
    credit_card_statement_id INTEGER,
    category_id INTEGER,
    payee_id INTEGER,
    recurrence_rule_id INTEGER,
    parent_transaction_id INTEGER,
    kind TEXT NOT NULL CHECK (kind IN ('income','expense','transfer')),
    status TEXT NOT NULL DEFAULT 'cleared' CHECK (status IN ('pending','cleared','cancelled')),
    description TEXT NOT NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    occurred_on TEXT NOT NULL,
    due_on TEXT,
    paid_on TEXT,
    installment_number INTEGER CHECK (installment_number IS NULL OR installment_number > 0),
    installment_total INTEGER CHECK (installment_total IS NULL OR installment_total > 0),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
    FOREIGN KEY (destination_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
    FOREIGN KEY (credit_card_id) REFERENCES credit_cards(id) ON DELETE SET NULL,
    FOREIGN KEY (credit_card_statement_id) REFERENCES credit_card_statements(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (payee_id) REFERENCES payees(id) ON DELETE SET NULL,
    FOREIGN KEY (recurrence_rule_id) REFERENCES recurrence_rules(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
    CHECK (kind <> 'transfer' OR destination_account_id IS NOT NULL),
    CHECK (installment_number IS NULL OR installment_total IS NULL OR installment_number <= installment_total)
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

CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, name),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transaction_tags (
    transaction_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (transaction_id, tag_id),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    category_id INTEGER,
    name TEXT NOT NULL,
    period_type TEXT NOT NULL DEFAULT 'monthly' CHECK (period_type IN ('weekly','monthly','yearly','custom')),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    starts_on TEXT NOT NULL,
    ends_on TEXT,
    rollover_enabled INTEGER NOT NULL DEFAULT 0 CHECK (rollover_enabled IN (0,1)),
    alert_percent INTEGER NOT NULL DEFAULT 80 CHECK (alert_percent BETWEEN 1 AND 100),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    account_id INTEGER,
    name TEXT NOT NULL,
    target_cents INTEGER NOT NULL CHECK (target_cents > 0),
    target_date TEXT,
    color TEXT,
    icon TEXT,
    is_completed INTEGER NOT NULL DEFAULT 0 CHECK (is_completed IN (0,1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS goal_contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    goal_id INTEGER NOT NULL,
    transaction_id INTEGER,
    amount_cents INTEGER NOT NULL CHECK (amount_cents <> 0),
    contributed_on TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    transaction_id INTEGER,
    file_name TEXT NOT NULL,
    mime_type TEXT,
    storage_path TEXT NOT NULL,
    size_bytes INTEGER CHECK (size_bytes IS NULL OR size_bytes >= 0),
    checksum_sha256 TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
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

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    entity_type TEXT NOT NULL,
    entity_public_id TEXT,
    action TEXT NOT NULL,
    changes_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, occurred_on) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id, occurred_on) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id, occurred_on) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_card_due ON transactions(credit_card_id, due_on) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_statement ON transactions(credit_card_statement_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transaction_splits_transaction ON transaction_splits(transaction_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal_date ON goal_contributions(goal_id, contributed_on);
CREATE INDEX IF NOT EXISTS idx_budgets_user_dates ON budgets(user_id, starts_on, ends_on);
CREATE INDEX IF NOT EXISTS idx_recurrence_next_run ON recurrence_rules(next_run_on) WHERE is_active = 1;
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_at, scheduled_for);

INSERT OR IGNORE INTO users (id, public_id, name) VALUES (1, 'local-user', 'Usuário local');
INSERT OR IGNORE INTO accounts (id, public_id, user_id, name, type) VALUES (1, 'default-account', 1, 'Conta principal', 'checking');

INSERT OR IGNORE INTO categories (public_id, user_id, name, kind, color, sort_order, is_system) VALUES
('cat-income-salary', 1, 'Salário', 'income', '#34d399', 10, 1),
('cat-income-internship', 1, 'Estágio', 'income', '#5eead4', 20, 1),
('cat-income-freelance', 1, 'Freelance', 'income', '#4d7fff', 30, 1),
('cat-income-other', 1, 'Outros', 'income', '#60a5fa', 40, 1),
('cat-expense-home', 1, 'Moradia', 'expense', '#4d7fff', 10, 1),
('cat-expense-food', 1, 'Alimentação', 'expense', '#5eead4', 20, 1),
('cat-expense-transport', 1, 'Transporte', 'expense', '#a78bfa', 30, 1),
('cat-expense-leisure', 1, 'Lazer', 'expense', '#f472b6', 40, 1),
('cat-expense-health', 1, 'Saúde', 'expense', '#fbbf24', 50, 1),
('cat-expense-education', 1, 'Educação', 'expense', '#34d399', 60, 1),
('cat-expense-subscriptions', 1, 'Assinaturas', 'expense', '#fb7185', 70, 1),
('cat-expense-other', 1, 'Outros', 'expense', '#60a5fa', 80, 1);

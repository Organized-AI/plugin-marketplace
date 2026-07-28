-- Canonical schema for a multi-account Google Worker.
-- Apply with: wrangler d1 execute <db> --remote --file schema.sql

CREATE TABLE IF NOT EXISTS accounts (
  account_id TEXT PRIMARY KEY, email TEXT NOT NULL, domain TEXT, label TEXT,
  kind TEXT NOT NULL DEFAULT 'personal',
  status TEXT NOT NULL DEFAULT 'active',          -- active | paused | reauth_required
  scopes TEXT NOT NULL DEFAULT '',
  surfaces TEXT NOT NULL DEFAULT '',              -- comma list of enabled capability groups
  last_ok_at INTEGER, last_error TEXT,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);

-- Access tokens deliberately live in KV with their own IV and a TTL, so this
-- table's single `iv` never covers two ciphertexts under one key.
CREATE TABLE IF NOT EXISTS tokens (
  account_id TEXT PRIMARY KEY,
  refresh_token_enc TEXT NOT NULL, key_version INTEGER NOT NULL DEFAULT 1, iv TEXT NOT NULL,
  expires_at INTEGER NOT NULL DEFAULT 0, granted_scopes TEXT NOT NULL DEFAULT '',
  rotated_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS oauth_state (
  state TEXT PRIMARY KEY, account_id TEXT, requested_scopes TEXT NOT NULL DEFAULT '',
  pkce_verifier TEXT, expires_at INTEGER NOT NULL, consumed_at INTEGER,
  created_at INTEGER NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'connect'         -- connect | signin
);

CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY, name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',            -- owner | operator | viewer
  status TEXT NOT NULL DEFAULT 'active',
  account_scope TEXT NOT NULL DEFAULT 'allowlist',-- all | allowlist
  invited_by TEXT, last_login_at INTEGER,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS user_accounts (
  email TEXT NOT NULL, account_id TEXT NOT NULL, granted_by TEXT, granted_at INTEGER NOT NULL,
  PRIMARY KEY (email, account_id)
);
CREATE INDEX IF NOT EXISTS idx_user_accounts_email ON user_accounts(email);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL,
  actor TEXT NOT NULL DEFAULT 'system', account_id TEXT, action TEXT NOT NULL,
  target TEXT, outcome TEXT NOT NULL DEFAULT 'ok', detail TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_account ON audit_log(account_id, ts DESC);

CREATE TABLE IF NOT EXISTS sweeps (
  sweep_id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL, cron TEXT,
  account_filter TEXT NOT NULL DEFAULT '*', config TEXT NOT NULL DEFAULT '{}',
  enabled INTEGER NOT NULL DEFAULT 1, last_run_at INTEGER,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sweep_runs (
  run_id TEXT PRIMARY KEY, sweep_id TEXT NOT NULL, started_at INTEGER NOT NULL,
  finished_at INTEGER, status TEXT NOT NULL DEFAULT 'running',
  accounts_total INTEGER NOT NULL DEFAULT 0, accounts_ok INTEGER NOT NULL DEFAULT 0,
  accounts_failed INTEGER NOT NULL DEFAULT 0, items_processed INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE INDEX IF NOT EXISTS idx_sweep_runs_sweep ON sweep_runs(sweep_id, started_at DESC);
CREATE TABLE IF NOT EXISTS sweep_findings (
  id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL, account_id TEXT NOT NULL,
  kind TEXT NOT NULL, title TEXT NOT NULL, url TEXT, detail TEXT, ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_findings_run ON sweep_findings(run_id, id DESC);

CREATE TABLE IF NOT EXISTS sync_state (
  account_id TEXT NOT NULL, surface TEXT NOT NULL, cursor TEXT, history_id TEXT,
  page_token TEXT, last_synced_at INTEGER, PRIMARY KEY (account_id, surface)
);

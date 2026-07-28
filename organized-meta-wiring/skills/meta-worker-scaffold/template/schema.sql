-- Canonical schema for a multi-account Meta Worker.
-- Apply with: wrangler d1 execute <db> --remote --file schema.sql

CREATE TABLE IF NOT EXISTS meta_accounts (
  account_id  TEXT PRIMARY KEY,          -- opaque local id
  business_id TEXT,                       -- Meta business portfolio id
  ad_account_id TEXT,                     -- act_XXXXXXXX
  label       TEXT,
  kind        TEXT NOT NULL DEFAULT 'own',-- own | client
  status      TEXT NOT NULL DEFAULT 'active', -- active | paused | reauth_required
  surfaces    TEXT NOT NULL DEFAULT '',   -- comma list of enabled surfaces
  last_ok_at  INTEGER, last_error TEXT,
  created_at  INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_meta_accounts_status ON meta_accounts(status);

-- The token IS the credential. Meta refresh returns a replacement string,
-- so this row is read-modify-written rather than paired with a refresh token.
CREATE TABLE IF NOT EXISTS meta_tokens (
  account_id  TEXT PRIMARY KEY,
  token_enc   TEXT NOT NULL,
  iv          TEXT NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  token_type  TEXT NOT NULL DEFAULT 'system_user',
  expires_at  INTEGER NOT NULL DEFAULT 0, -- 0 = non-expiring
  scopes      TEXT NOT NULL DEFAULT '',
  rotated_at  INTEGER,
  created_at  INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_meta_tokens_expiry ON meta_tokens(expires_at);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL,
  actor TEXT NOT NULL DEFAULT 'system', account_id TEXT, action TEXT NOT NULL,
  target TEXT, outcome TEXT NOT NULL DEFAULT 'ok', detail TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts DESC);

-- Rolling record of BUC usage so you can see throttling coming.
CREATE TABLE IF NOT EXISTS rate_observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL,
  account_id TEXT, buc_type TEXT, call_pct REAL, cpu_pct REAL, time_pct REAL,
  regain_minutes INTEGER, tier TEXT
);
CREATE INDEX IF NOT EXISTS idx_rate_ts ON rate_observations(ts DESC);

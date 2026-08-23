ALTER TABLE users ADD COLUMN is_platform_admin INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events(created);

CREATE TABLE IF NOT EXISTS system_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS client_sessions (
  id TEXT PRIMARY KEY,
  user TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  client_version TEXT NOT NULL DEFAULT '',
  client_build TEXT NOT NULL DEFAULT '',
  pending_sync_count INTEGER NOT NULL DEFAULT 0,
  last_sync_at TEXT,
  last_seen_at TEXT NOT NULL,
  user_agent TEXT NOT NULL DEFAULT '',
  platform TEXT NOT NULL DEFAULT '',
  created TEXT NOT NULL,
  updated TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_sessions_user_store ON client_sessions(user, store);
CREATE INDEX IF NOT EXISTS idx_client_sessions_last_seen ON client_sessions(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_client_sessions_store ON client_sessions(store);

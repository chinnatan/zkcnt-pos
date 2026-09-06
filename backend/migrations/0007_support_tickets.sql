CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  reporter TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store TEXT REFERENCES stores(id),
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL DEFAULT '',
  body_text TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  metadata TEXT NOT NULL DEFAULT '{}',
  last_reply_at TEXT,
  last_reply_by TEXT,
  created TEXT NOT NULL,
  updated TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id TEXT PRIMARY KEY,
  ticket TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_role TEXT NOT NULL,
  body_html TEXT NOT NULL DEFAULT '',
  body_text TEXT NOT NULL DEFAULT '',
  created TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_reporter ON support_tickets(reporter);
CREATE INDEX IF NOT EXISTS idx_support_tickets_store ON support_tickets(store);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status_created ON support_tickets(status, created);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket ON support_ticket_messages(ticket);


CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,             -- e.g., 'reaction', 'view', 'session'
  post_id INTEGER,                -- nullable; associated post if applicable
  anon_id TEXT,                   -- for anonymous users
  session_id TEXT,                -- for admin/auth events (using TEXT for UUID in SQLite)
  data TEXT DEFAULT '{}',         -- optional extra info (using TEXT for JSON in SQLite)
  created_at TEXT DEFAULT (datetime('now'))
);


-- migrations/018-qotd.sql
CREATE TABLE qotd (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  author TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Add index for faster random selection
CREATE INDEX idx_qotd_id ON qotd(id);

-- SQLite doesn't support COMMENT ON syntax
-- qotd: For Quote of the day (QOTD) feature

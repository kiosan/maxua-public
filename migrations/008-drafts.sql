-- 008-drafts.sql
-- Create drafts table for server-side draft storage

CREATE TABLE drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  share_telegram INTEGER DEFAULT 1,
  share_bluesky INTEGER DEFAULT 0,
  title TEXT -- Optional draft title/name
);

-- Add an index on updated_at for faster sorting
CREATE INDEX idx_drafts_updated_at ON drafts(updated_at);

-- SQLite doesn't support COMMENT ON syntax
-- Keeping documentation as comments in the migration file:
-- drafts: Stored post drafts
-- drafts.content: Draft post content
-- drafts.topic_id: Optional topic ID for the draft
-- drafts.share_telegram: Whether to share to Telegram when published (1=true, 0=false)
-- drafts.share_bluesky: Whether to share to Bluesky when published (1=true, 0=false)
-- drafts.title: Optional title/name for the draft

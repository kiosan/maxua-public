-- migrations/019-attachments.sql
CREATE TABLE attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'html', 'image', etc.
  content TEXT NOT NULL,      -- HTML content or other data based on type
  position INTEGER DEFAULT 0, -- For ordering multiple attachments
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Create index for faster lookups by post_id
CREATE INDEX idx_attachments_post_id ON attachments(post_id);

-- SQLite doesn't support COMMENT ON syntax
-- attachments: Stores post attachments such as rich text, images, etc.

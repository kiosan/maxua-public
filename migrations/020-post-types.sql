-- migrations/020-post-types.sql
-- Add support for different post types (text, quote, link)

-- Add type and metadata columns to posts table
ALTER TABLE posts ADD COLUMN type TEXT DEFAULT 'text';
ALTER TABLE posts ADD COLUMN metadata TEXT DEFAULT '{}';

-- Create an index for faster type-based queries
CREATE INDEX idx_posts_type ON posts(type);

-- SQLite doesn't support adding constraints with ALTER TABLE
-- Recreate the posts table with the constraint
PRAGMA foreign_keys = OFF;

CREATE TABLE posts_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  preview_text TEXT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
  image_url TEXT,
  transistor_fm_code TEXT,
  share_email INTEGER DEFAULT 1,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'quote', 'link')),
  metadata TEXT DEFAULT '{}'
);

INSERT INTO posts_new (id, content, preview_text, created_at, topic_id, image_url, transistor_fm_code, share_email, type, metadata)
SELECT id, content, preview_text, created_at, topic_id, image_url, transistor_fm_code, share_email, type, metadata FROM posts;

DROP TABLE posts;
ALTER TABLE posts_new RENAME TO posts;

-- Recreate the indexes
CREATE INDEX idx_posts_topic_id ON posts(topic_id);

PRAGMA foreign_keys = ON;

-- SQLite doesn't support COMMENT ON syntax
-- posts.type: Type of post: text, quote, or link
-- posts.metadata: Type-specific metadata stored as JSON

-- migrations/015-comment-upvotes.sql
-- Simple comment upvotes system

CREATE TABLE comment_upvotes (
  comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  anon_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (comment_id, anon_id)
);

-- Index for faster lookups
CREATE INDEX idx_comment_upvotes_comment_id ON comment_upvotes(comment_id);

-- SQLite doesn't support COMMENT ON syntax
-- comment_upvotes: Tracks user upvotes on comments

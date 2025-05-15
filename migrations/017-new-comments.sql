

-- New, "private by default" comments system

CREATE TABLE comments2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  email TEXT,
  content TEXT NOT NULL,
  pinned INTEGER DEFAULT 0,
  author_reply TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_private_comments_post_id ON comments2(post_id);

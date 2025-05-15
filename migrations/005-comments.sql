
CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  anon_id TEXT,
  author TEXT NOT NULL,
  email TEXT NOT NULL,
  content TEXT NOT NULL,
  author_reply TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  confirmed INTEGER DEFAULT 0,
  token TEXT
);

CREATE INDEX idx_comments_post_id ON comments(post_id);

CREATE TABLE verified_commenters (
  email TEXT NOT NULL,
  anon_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  is_banned INTEGER DEFAULT 0,
  PRIMARY KEY (email, anon_id)
);


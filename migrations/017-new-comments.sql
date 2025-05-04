

-- New, "private by default" comments system

CREATE TABLE comments2 (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  email TEXT,
  content TEXT NOT NULL,
  pinned BOOLEAN DEFAULT FALSE,
  author_reply TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_private_comments_post_id ON comments2(post_id);

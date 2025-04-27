
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  anon_id TEXT,
  author TEXT NOT NULL,
  email TEXT NOT NULL,
  content TEXT NOT NULL,
  author_reply TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed BOOLEAN DEFAULT FALSE,
  token UUID
);

CREATE INDEX ON comments(post_id);

CREATE TABLE verified_commenters (
  email TEXT NOT NULL,
  anon_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  is_banned BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (email, anon_id)
);


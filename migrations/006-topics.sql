
-- Topics: max one per post

-- Create topics table
CREATE TABLE topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Add topic_id to posts table (nullable - posts can have no topic)
ALTER TABLE posts ADD COLUMN topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL;

-- Create index for faster topic-based queries
CREATE INDEX idx_posts_topic_id ON posts(topic_id);

-- Insert initial topics
INSERT INTO topics (name, slug, description) VALUES 
  ('Startups', 'startups', 'Posts about startups, entrepreneurship and building things'),
  ('LLMs', 'llms', 'Posts about large language models and AI'),
  ('Microblog', 'microblog', 'Posts about this microblog platform');

-- Assign topics to existing posts
-- Microblog posts
UPDATE posts SET topic_id = (SELECT id FROM topics WHERE slug = 'microblog') 
WHERE id IN (78, 76, 74, 73, 71, 70, 57, 53, 52, 51, 47);

-- LLMs posts
UPDATE posts SET topic_id = (SELECT id FROM topics WHERE slug = 'llms') 
WHERE id IN (77, 75, 69, 56);

-- Startups posts
UPDATE posts SET topic_id = (SELECT id FROM topics WHERE slug = 'startups') 
WHERE id IN (60, 50);

-- Add activity logging for topic changes
-- SQLite doesn't support COMMENT ON TABLE, this is just a comment in the migration file

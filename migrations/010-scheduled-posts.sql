-- migrations/010-scheduled-posts.sql
-- Create scheduled posts table for delayed post publishing

CREATE TABLE scheduled_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now')),
  scheduled_for TEXT NOT NULL, -- When the post should be published
  published_at TEXT, -- Set when actually published (NULL = not published yet)
  share_telegram INTEGER DEFAULT 1,
  share_bluesky INTEGER DEFAULT 0,
  share_email INTEGER DEFAULT 1
);

-- Add indexes for faster querying
CREATE INDEX idx_scheduled_posts_published_at ON scheduled_posts(published_at);
CREATE INDEX idx_scheduled_posts_scheduled_for ON scheduled_posts(scheduled_for);

-- SQLite doesn't support COMMENT ON syntax
-- Documentation comments for scheduled_posts table:
-- scheduled_posts: Stored scheduled posts for delayed publishing
-- scheduled_posts.content: Post content
-- scheduled_posts.topic_id: Optional topic ID for the post
-- scheduled_posts.scheduled_for: When the post should be published
-- scheduled_posts.published_at: When the post was actually published (NULL = not published yet)
-- scheduled_posts.share_telegram: Whether to share to Telegram when published (1=true, 0=false)
-- scheduled_posts.share_bluesky: Whether to share to Bluesky when published (1=true, 0=false)
-- scheduled_posts.share_email: Whether to share via email when published (1=true, 0=false)

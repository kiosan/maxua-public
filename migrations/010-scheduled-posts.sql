-- migrations/010-scheduled-posts.sql
-- Create scheduled posts table for delayed post publishing

CREATE TABLE scheduled_posts (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL, -- When the post should be published
  published_at TIMESTAMP WITH TIME ZONE, -- Set when actually published (NULL = not published yet)
  share_telegram BOOLEAN DEFAULT TRUE,
  share_bluesky BOOLEAN DEFAULT FALSE,
  share_email BOOLEAN DEFAULT TRUE
);

-- Add indexes for faster querying
CREATE INDEX idx_scheduled_posts_published_at ON scheduled_posts(published_at);
CREATE INDEX idx_scheduled_posts_scheduled_for ON scheduled_posts(scheduled_for);

-- Add comments for documentation
COMMENT ON TABLE scheduled_posts IS 'Stored scheduled posts for delayed publishing';
COMMENT ON COLUMN scheduled_posts.content IS 'Post content';
COMMENT ON COLUMN scheduled_posts.topic_id IS 'Optional topic ID for the post';
COMMENT ON COLUMN scheduled_posts.scheduled_for IS 'When the post should be published';
COMMENT ON COLUMN scheduled_posts.published_at IS 'When the post was actually published (NULL = not published yet)';
COMMENT ON COLUMN scheduled_posts.share_telegram IS 'Whether to share to Telegram when published';
COMMENT ON COLUMN scheduled_posts.share_bluesky IS 'Whether to share to Bluesky when published';
COMMENT ON COLUMN scheduled_posts.share_email IS 'Whether to share via email when published';

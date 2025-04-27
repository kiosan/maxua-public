-- 008-drafts.sql
-- Create drafts table for server-side draft storage

CREATE TABLE drafts (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  share_telegram BOOLEAN DEFAULT TRUE,
  share_bluesky BOOLEAN DEFAULT FALSE,
  title TEXT -- Optional draft title/name
);

-- Add an index on updated_at for faster sorting
CREATE INDEX idx_drafts_updated_at ON drafts(updated_at);

-- Add comments for documentation
COMMENT ON TABLE drafts IS 'Stored post drafts';
COMMENT ON COLUMN drafts.content IS 'Draft post content';
COMMENT ON COLUMN drafts.topic_id IS 'Optional topic ID for the draft';
COMMENT ON COLUMN drafts.share_telegram IS 'Whether to share to Telegram when published';
COMMENT ON COLUMN drafts.share_bluesky IS 'Whether to share to Bluesky when published';
COMMENT ON COLUMN drafts.title IS 'Optional title/name for the draft';

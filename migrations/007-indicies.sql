
-- For faster topic-based queries
CREATE INDEX IF NOT EXISTS idx_posts_topic_id ON posts(topic_id);

-- For faster reaction lookups
CREATE INDEX IF NOT EXISTS idx_reactions_post_id_emoji ON reactions(post_id, emoji);

-- For faster comment lookups
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);

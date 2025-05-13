-- migrations/021-digest-sent.sql
-- Add digest_sent field to posts table to track which posts have been included in email digests

-- Add the digest_sent field (null by default)
ALTER TABLE posts ADD COLUMN digest_sent TIMESTAMP WITH TIME ZONE;

-- Add an index for faster querying of posts that haven't been sent
CREATE INDEX idx_posts_digest_sent ON posts(digest_sent) WHERE digest_sent IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN posts.digest_sent IS 'When this post was sent in a digest email. NULL means not sent yet.';

UPDATE posts 
SET digest_sent = created_at 
WHERE created_at < '2025-05-12'::timestamp 
  AND status = 'public';

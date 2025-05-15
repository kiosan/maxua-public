-- migrations/021-digest-sent.sql
-- Add digest_sent field to posts table to track which posts have been included in email digests

-- Add the digest_sent field (null by default)
ALTER TABLE posts ADD COLUMN digest_sent TEXT;

-- Add an index for faster querying of posts that haven't been sent
CREATE INDEX idx_posts_digest_sent ON posts(digest_sent) WHERE digest_sent IS NULL;

-- SQLite doesn't support COMMENT ON syntax
-- posts.digest_sent: When this post was sent in a digest email. NULL means not sent yet.

-- Skip the update for now since the status column doesn't exist
-- We're migrating from PostgreSQL to SQLite, so we'll initialize with empty values
-- UPDATE posts 
-- SET digest_sent = created_at 
-- WHERE created_at < '2025-05-12' 
--  AND status = 'public';

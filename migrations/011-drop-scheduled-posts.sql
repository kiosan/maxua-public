-- migrations/011-drop-scheduled-posts.sql
-- Drop the scheduled posts table to remove the feature

-- First drop any indexes
DROP INDEX IF EXISTS idx_scheduled_posts_published_at;
DROP INDEX IF EXISTS idx_scheduled_posts_scheduled_for;

-- Then drop the table
DROP TABLE IF EXISTS scheduled_posts;

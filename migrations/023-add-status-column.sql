-- Add status column to posts table
-- This column is used to differentiate between draft and published posts

-- Add the column if it doesn't exist
ALTER TABLE posts ADD COLUMN status TEXT DEFAULT 'public';

-- Update status values: For most existing posts, set status to 'public' (published)
-- For posts in the drafts table, set status to 'draft'
UPDATE posts SET status = 'public' WHERE status IS NULL;

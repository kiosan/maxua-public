-- Add updated_at column to posts table

-- Add the column
ALTER TABLE posts ADD COLUMN updated_at TEXT DEFAULT NULL;

-- Update existing posts to have updated_at equal to created_at
UPDATE posts SET updated_at = created_at WHERE updated_at IS NULL;

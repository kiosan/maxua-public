-- migrations/020-post-types.sql
-- Add support for different post types (regular, quote, link)

-- Add type and metadata columns to posts table
ALTER TABLE posts 
ADD COLUMN type VARCHAR(20) DEFAULT 'regular',
ADD COLUMN metadata JSONB DEFAULT '{}';

-- Create an index for faster type-based queries
CREATE INDEX idx_posts_type ON posts(type);

-- Add constraint to ensure type is one of the allowed values
ALTER TABLE posts 
ADD CONSTRAINT posts_type_check CHECK (type IN ('regular', 'quote', 'link'));

-- Add comment for documentation
COMMENT ON COLUMN posts.type IS 'Type of post: regular, quote, or link';
COMMENT ON COLUMN posts.metadata IS 'Type-specific metadata stored as JSON';

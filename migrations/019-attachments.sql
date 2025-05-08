-- migrations/019-attachments.sql
CREATE TABLE attachments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'html', 'image', etc.
  content TEXT NOT NULL,      -- HTML content or other data based on type
  position INTEGER DEFAULT 0, -- For ordering multiple attachments
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups by post_id
CREATE INDEX idx_attachments_post_id ON attachments(post_id);

-- Add comment for documentation
COMMENT ON TABLE attachments IS 'Stores post attachments such as rich text, images, etc.';

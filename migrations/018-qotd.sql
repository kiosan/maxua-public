-- migrations/018-qotd.sql
CREATE TABLE qotd (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  author VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster random selection
CREATE INDEX idx_qotd_id ON qotd(id);

-- Add comment for documentation
COMMENT ON TABLE qotd IS 'For Quote of the day (QOTD) feature';

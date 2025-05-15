
-- Create audio_attachments table
CREATE TABLE audio_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  cloudinary_public_id TEXT,
  title TEXT,
  duration INTEGER, -- in seconds
  transcript TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Create index for faster lookups by post_id
CREATE INDEX idx_audio_attachments_post_id ON audio_attachments(post_id);

-- Insert a test record (you can modify this with your actual test data later)
INSERT INTO audio_attachments (post_id, audio_url, title, duration)
VALUES (1, 'https://res.cloudinary.com/dbsrg7dpg/video/upload/v1743931428/Ep_162_b7anyd.mp3', 'Test Podcast (ep162)', 40);

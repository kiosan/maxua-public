
CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,             -- e.g., 'reaction', 'view', 'session'
  post_id INTEGER,                -- nullable; associated post if applicable
  anon_id TEXT,                   -- for anonymous users
  session_id UUID,                -- for admin/auth events
  data JSONB DEFAULT '{}'::jsonb, -- optional extra info
  created_at TIMESTAMPTZ DEFAULT NOW()
);


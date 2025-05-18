-- Migration #025: Add referrer_stats table for tracking traffic sources
-- Simplified SQLite compatible version that only tracks referrers

CREATE TABLE IF NOT EXISTS referrer_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer TEXT NOT NULL,                    -- Where the visitor came from
  path TEXT NOT NULL,                        -- Which page they visited
  timestamp TEXT DEFAULT (datetime('now')),  -- When the visit happened
  user_agent TEXT                            -- Basic browser info
);

-- Create index for faster queries on timestamp
CREATE INDEX IF NOT EXISTS idx_referrer_stats_timestamp ON referrer_stats(timestamp);

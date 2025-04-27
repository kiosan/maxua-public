INSERT INTO posts (content) VALUES
  ('First post! Testing 🎉'),
  ('Another day, another post. 🚀'),
  ('What if we all just went hiking? 🥾🌲');

-- Simulate reactions
INSERT INTO reactions (post_id, emoji, anon_id) VALUES
  (1, '🔥', 'anon_abc'),
  (1, '👍', 'anon_xyz'),
  (2, '💯', 'anon_123'),
  (3, '🔥', 'anon_abc'),
  (3, '🔥', 'anon_def');


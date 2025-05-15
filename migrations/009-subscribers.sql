-- migrations/009-subscribers.sql
-- Create subscribers table for email subscriptions

CREATE TABLE subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  confirmed INTEGER DEFAULT 0,
  confirmation_token TEXT,
  unsubscribe_token TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  last_sent_at TEXT
);

-- Add index for faster lookups
CREATE INDEX idx_subscribers_email ON subscribers(email);
CREATE INDEX idx_subscribers_confirmed ON subscribers(confirmed);
CREATE INDEX idx_subscribers_confirmation_token ON subscribers(confirmation_token) WHERE confirmation_token IS NOT NULL;
CREATE INDEX idx_subscribers_unsubscribe_token ON subscribers(unsubscribe_token);

-- Table for tracking which posts have been sent via email
CREATE TABLE email_deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  sent_at TEXT DEFAULT (datetime('now')),
  recipient_count INTEGER NOT NULL DEFAULT 0,
  subject TEXT,
  UNIQUE(post_id)
);

-- SQLite doesn't support COMMENT ON syntax
-- Documentation comments for subscribers table:
-- subscribers: Email subscribers for the blog
-- subscribers.email: Subscriber email address
-- subscribers.name: Optional subscriber name
-- subscribers.confirmed: Whether the subscription has been confirmed (1=true, 0=false)
-- subscribers.confirmation_token: Token for confirming subscription
-- subscribers.unsubscribe_token: Token for unsubscribing
-- subscribers.last_sent_at: When the last email was sent to this subscriber

-- Documentation comments for email_deliveries table:
-- email_deliveries: Records of emails sent for posts
-- email_deliveries.post_id: Post that was sent via email
-- email_deliveries.sent_at: When the email was sent
-- email_deliveries.recipient_count: Number of recipients the email was sent to

-- Add share_email column to posts table
ALTER TABLE posts ADD COLUMN share_email INTEGER DEFAULT 1;

-- Add share_email column to drafts table
ALTER TABLE drafts ADD COLUMN share_email INTEGER DEFAULT 1;

-- Test subscriber
INSERT INTO subscribers (email, name, confirmed, unsubscribe_token)
VALUES ('obondar@gmail.com', 'Sasha Bondar', 1, (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))));

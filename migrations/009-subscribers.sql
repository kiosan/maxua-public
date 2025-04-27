-- migrations/009-subscribers.sql
-- Create subscribers table for email subscriptions

CREATE TABLE subscribers (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed BOOLEAN DEFAULT FALSE,
  confirmation_token UUID,
  unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid(),
  last_sent_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Add index for faster lookups
CREATE INDEX idx_subscribers_email ON subscribers(email);
CREATE INDEX idx_subscribers_confirmed ON subscribers(confirmed);
CREATE INDEX idx_subscribers_confirmation_token ON subscribers(confirmation_token) WHERE confirmation_token IS NOT NULL;
CREATE INDEX idx_subscribers_unsubscribe_token ON subscribers(unsubscribe_token);

-- Table for tracking which posts have been sent via email
CREATE TABLE email_deliveries (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recipient_count INTEGER NOT NULL DEFAULT 0,
  subject TEXT,
  UNIQUE(post_id)
);

-- Add comments for documentation
COMMENT ON TABLE subscribers IS 'Email subscribers for the blog';
COMMENT ON COLUMN subscribers.email IS 'Subscriber email address';
COMMENT ON COLUMN subscribers.name IS 'Optional subscriber name';
COMMENT ON COLUMN subscribers.confirmed IS 'Whether the subscription has been confirmed';
COMMENT ON COLUMN subscribers.confirmation_token IS 'Token for confirming subscription';
COMMENT ON COLUMN subscribers.unsubscribe_token IS 'Token for unsubscribing';
COMMENT ON COLUMN subscribers.last_sent_at IS 'When the last email was sent to this subscriber';

COMMENT ON TABLE email_deliveries IS 'Records of emails sent for posts';
COMMENT ON COLUMN email_deliveries.post_id IS 'Post that was sent via email';
COMMENT ON COLUMN email_deliveries.sent_at IS 'When the email was sent';
COMMENT ON COLUMN email_deliveries.recipient_count IS 'Number of recipients the email was sent to';

-- Add share_email column to posts table
ALTER TABLE posts ADD COLUMN share_email BOOLEAN DEFAULT TRUE;

-- Add share_email column to drafts table
ALTER TABLE drafts ADD COLUMN share_email BOOLEAN DEFAULT TRUE;

-- Test subscriber
INSERT INTO subscribers (email, name, confirmed, unsubscribe_token)
VALUES ('ischenko@gmail.com', 'Max Ischenko', true, gen_random_uuid());

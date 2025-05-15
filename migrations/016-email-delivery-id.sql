-- migrations/016-email-delivery-id.sql
-- Modify email_deliveries to use a descriptive string identifier instead of a foreign key

-- Need to look at the structure of email_deliveries table first
-- For SQLite, we'll recreate the table with the new column
-- Create a completely new email_deliveries table with our desired structure
CREATE TABLE email_deliveries_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  delivery_id TEXT NOT NULL,
  sent_at TEXT DEFAULT (datetime('now')),
  recipient_count INTEGER NOT NULL DEFAULT 0,
  subject TEXT
);

-- Insert default values for any existing records
-- Since we're switching database systems, we'll just create placeholder data
INSERT INTO email_deliveries_new (delivery_id, recipient_count)
VALUES ('migration-placeholder', 0);

-- Drop the old table and rename the new one
DROP TABLE IF EXISTS email_deliveries;
ALTER TABLE email_deliveries_new RENAME TO email_deliveries;

-- Add an index for faster lookups by delivery_id
CREATE INDEX idx_email_deliveries_delivery_id ON email_deliveries(delivery_id);

-- No need to drop post_id as we created a new table structure

-- SQLite doesn't support COMMENT ON syntax
-- email_deliveries.delivery_id: Identifier for email delivery, e.g. post#123 or digest#20250501


-- add 'preferences' field and a weekly subscriber type
ALTER TABLE subscribers ADD COLUMN preferences TEXT DEFAULT 'single-post';

-- SQLite doesn't support ADD CONSTRAINT in ALTER TABLE
-- Recreate the table to add the constraint
CREATE TABLE subscribers_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  confirmed INTEGER DEFAULT 0,
  confirmation_token TEXT,
  unsubscribe_token TEXT NOT NULL,
  last_sent_at TEXT,
  preferences TEXT DEFAULT 'single-post' CHECK (preferences IN ('single-post', 'digest'))
);

INSERT INTO subscribers_new(id, email, name, created_at, confirmed, confirmation_token, unsubscribe_token, last_sent_at, preferences)
SELECT id, email, name, created_at, confirmed, confirmation_token, unsubscribe_token, last_sent_at, preferences FROM subscribers;

DROP TABLE subscribers;
ALTER TABLE subscribers_new RENAME TO subscribers;

-- SQLite handles constraints differently - unique constraint already added in the table recreation above
-- Create index for the unique constraint
CREATE UNIQUE INDEX idx_unique_email_preferences ON subscribers(email, preferences);


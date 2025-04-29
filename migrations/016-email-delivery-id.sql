-- migrations/016-email-delivery-id.sql
-- Modify email_deliveries to use a descriptive string identifier instead of a foreign key

ALTER TABLE email_deliveries ADD COLUMN delivery_id TEXT;

UPDATE email_deliveries SET delivery_id = 'post#' || post_id;
ALTER TABLE email_deliveries ALTER COLUMN delivery_id SET NOT NULL;

-- Add an index for faster lookups by delivery_id
CREATE INDEX idx_email_deliveries_delivery_id ON email_deliveries(delivery_id);

ALTER TABLE email_deliveries DROP COLUMN post_id;

-- Add a comment for documentation
COMMENT ON COLUMN email_deliveries.delivery_id IS 'Identifier for email delivery, e.g. post#123 or digest#20250501';


-- add 'preferences' field and a weekly subscriber type
ALTER TABLE subscribers
ADD COLUMN preferences TEXT DEFAULT 'single-post',
ADD CONSTRAINT preferences_check CHECK (preferences IN ('single-post', 'digest'));

-- we also need to change/replace our UNIQUE constraint
ALTER TABLE subscribers DROP CONSTRAINT subscribers_email_key;
ALTER TABLE subscribers ADD CONSTRAINT unique_email_preferences UNIQUE (email, preferences);


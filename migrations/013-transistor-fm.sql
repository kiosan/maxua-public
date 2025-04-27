-- Remove ad-hoc audio player and add support for Transistor.fm player embeds

-- First, drop any foreign key constraints
ALTER TABLE audio_attachments DROP CONSTRAINT IF EXISTS audio_attachments_post_id_fkey;

DELETE FROM audio_attachments;

DROP INDEX IF EXISTS idx_audio_attachments_post_id;

DROP TABLE IF EXISTS audio_attachments;

ALTER TABLE posts ADD COLUMN transistor_fm_code VARCHAR(20);
COMMENT ON COLUMN posts.podcast_id IS 'Transistor.fm episode ID for podcast embeds';


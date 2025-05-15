-- Remove ad-hoc audio player and add support for Transistor.fm player embeds

-- SQLite doesn't support ALTER TABLE DROP CONSTRAINT
-- Foreign key constraints will be dropped when the table is dropped

DELETE FROM audio_attachments;

DROP INDEX IF EXISTS idx_audio_attachments_post_id;

DROP TABLE IF EXISTS audio_attachments;

ALTER TABLE posts ADD COLUMN transistor_fm_code TEXT;
-- SQLite doesn't support COMMENT ON syntax
-- posts.podcast_id: Transistor.fm episode ID for podcast embeds


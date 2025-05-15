-- Add slug column to posts table if missing
-- This column is used for SEO-friendly URLs and redirects

-- Check if the slug column already exists
SELECT COUNT(*) FROM pragma_table_info('posts') WHERE name = 'slug';

-- If it doesn't exist, add it
ALTER TABLE posts ADD COLUMN slug TEXT;

-- For existing posts without slugs, generate slugs from preview_text or content
UPDATE posts SET 
  slug = LOWER(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              SUBSTRING(COALESCE(preview_text, SUBSTRING(content, 1, 100)), 1, 50),
              ' ', '-'
            ),
            '.', ''
          ),
          ',', ''
        ),
        '?', ''
      ),
      '!', ''
    )
  )
WHERE slug IS NULL;

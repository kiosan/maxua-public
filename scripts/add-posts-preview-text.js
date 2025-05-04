// scripts/migrate-preview-text.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migratePreviewText() {
  console.log('Starting preview_text migration...');
  
  try {
    console.log('Fetching posts...');
    
    // Fetch all posts
    // We'll check the preview_text in our code rather than in SQL
    const result = await pool.query('SELECT id, content, preview_text FROM posts');
    console.log(`Found ${result.rows.length} posts total`);
    
    let updateCount = 0;
    
    // Process each post and update preview_text if needed
    for (const post of result.rows) {
      // Skip if preview_text already exists and doesn't end with '...'
      // This means it was likely set manually
      if (post.preview_text && post.preview_text.trim() !== '' && !post.preview_text.endsWith('..')) {
        console.log(`Skipping post ${post.id} - custom preview_text detected (${post.preview_text})`);
        continue;
      }
      
      // Generate preview text using the same logic as for new posts
      const content = post.content;
      let previewText = content;
      
      if (content.length > 30) {
        // Try to cut at a space, not mid-word
        const truncateAt = content.lastIndexOf(' ', 27);
        previewText = content.substring(0, truncateAt > 0 ? truncateAt : 27) + '..';
      }
      
      // Remove any newlines from preview text
      previewText = previewText.replace(/\n/g, ' ').trim();
      
      // Update the post with the new preview_text
      await pool.query(
        'UPDATE posts SET preview_text = $1 WHERE id = $2',
        [previewText, post.id]
      );
      
      updateCount++;
    }
    
    console.log(`Migration completed successfully! Updated ${updateCount} posts.`);
    
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the migration
migratePreviewText().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

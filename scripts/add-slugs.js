// scripts/addSlugsToExistingPosts.js
require('dotenv').config();
const { db, runQuery, transliterateCyrillic, translateText, generateSlug } = require('../server/utils');

/**
 * Async wrapper for generateSlug that supports method choice
 * @param {string} text - The text to convert to a slug
 * @param {string} method - Method to use ('transliterate' or 'translate')
 * @returns {Promise<string>} - URL-friendly slug
 */
async function createSlug(text, method = 'transliterate') {
  if (!text) return '';
  
  if (method === 'translate') {
    // First translate the text
    const translatedText = await translateText(text);
    console.log(`Translated: ${text} -> ${translatedText}`);
    // Then generate a slug from the translated text (with transliteration disabled)
    return generateSlug(translatedText, false);
  } else {
    // Use the built-in transliteration
    const slug = generateSlug(text, true);
    console.log(`Transliterated: ${text} -> ${slug}`);
    return slug;
  }
}

async function addSlugsToExistingPosts(method = 'transliterate') {
  console.log(`Starting to add slugs to existing posts using method: ${method}...`);
  
  try {
    // Get all posts without slugs
    const postsResult = await runQuery(
      'SELECT id, title FROM posts WHERE slug IS NULL OR slug = \'\''  
    );
    const posts = postsResult.rows;

    console.log(`Found ${posts.length} posts without slugs`);

    // Process each post
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const slug = await createSlug(post.title, method);
      
      // Add a unique identifier if necessary
      let finalSlug = slug;

      // Check if slug already exists
      const existingResult = await runQuery(
        'SELECT id FROM posts WHERE slug = ? AND id != ?',
        [finalSlug, post.id]
      );
      
      // If slug exists, append a number
      if (existingResult.rows.length > 0) {
        let counter = 1;
        let uniqueSlug = finalSlug;
        
        while (true) {
          uniqueSlug = `${finalSlug}-${counter}`;
          const checkResult = await runQuery(
            'SELECT id FROM posts WHERE slug = ?',
            [uniqueSlug]
          );
          
          if (checkResult.rows.length === 0) {
            finalSlug = uniqueSlug;
            break;
          }
          
          counter++;
        }
      }
      
      // Update the post with the new slug
      await runQuery(
        'UPDATE posts SET slug = ? WHERE id = ?',
        [finalSlug, post.id]
      );

      console.log(`Updated post ${post.id} with slug: ${finalSlug}`);
    }
    
    console.log('Finished adding slugs to existing posts.');
  } catch (error) {
    console.error('Error adding slugs:', error);
  }
}

// Process command line arguments
const args = process.argv.slice(2);
let method = 'transliterate'; // Default to transliteration

// Check for method argument
if (args.includes('--translate')) {
  method = 'translate';
}

console.log('Usage: node scripts/add-slugs.js [--translate]');
console.log('  --translate: Use translation instead of transliteration');
console.log('  Default: Use transliteration for Cyrillic text');

// Run the script
addSlugsToExistingPosts(method).then(() => {
  console.log(`Finished adding slugs to posts using ${method} method!`);
  process.exit(0);
}).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});

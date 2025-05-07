// scripts/addSlugsToExistingPosts.js
require('dotenv').config();
const { pool } = require('../server/utils');

async function translateText(text) {
  const key = process.env.AZURE_TRANSLATOR_KEY;
  const endpoint = 'https://api.cognitive.microsofttranslator.com';
  const location = process.env.AZURE_TRANSLATOR_LOCATION || 'westeurope';
  
  // from=uk to force UA->EN translation
  // why? autodetect won't work if first half is in English :)
  const response = await fetch(`${endpoint}/translate?api-version=3.0&from=uk&to=en`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Ocp-Apim-Subscription-Region': location,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([{ text }])
  });
  
  if (!response.ok) {
    throw new Error(`Translation API error: ${response.status}`);
  }
  
  const result = await response.json();
  const translation = result[0]?.translations[0]?.text;
  console.log(`trans: ${text} -> ${translation}`);
  return translation;
}

/**
 * Generate a URL-friendly slug from text
 * If text contains Cyrillic characters, translate it to English first
 * @param {string} text - The text to convert to a slug
 * @returns {string} - URL-friendly slug
 */
async function generateSlug(text) {
  if (!text) return '';
  
  // Check if text contains Cyrillic characters
  const hasCyrillic = /[а-яА-ЯіїєґІЇЄҐ]/.test(text);
  
  // If text has Cyrillic characters, translate it to English first
  let processedText = text;
  if (hasCyrillic) {
    try {
      // Use existing Azure translation service
      processedText = await translateText(text);
    } catch (error) {
      console.error('Translation error:', error);
      // Fall back to the original text if translation fails
    }
  }
  
  return processedText
    .toString()
    .toLowerCase()
    .trim()
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove special characters
    .replace(/[^\w\-]+/g, '')
    // Remove duplicate hyphens
    .replace(/\-\-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    // Limit length
    .substring(0, 30);
}

async function addSlugsToExistingPosts() {
  console.log('Starting to add slugs to existing posts...');
  
  try {
    // Get all posts without slugs
    const result = await pool.query(`
      SELECT id, content, preview_text
      FROM posts
      WHERE slug IS NULL OR slug = ''
    `);
    
    console.log(`Found ${result.rows.length} posts without slugs.`);
    
    if (result.rows.length === 0) {
      console.log('No posts need updating.');
      return;
    }
    
    // Process each post
    for (const post of result.rows) {
      // Use preview_text if available, otherwise use the first part of content
      const textToSlugify = post.preview_text || (post.content && post.content.length > 50 
        ? post.content.substring(0, 50) 
        : post.content);
      
      if (!textToSlugify) {
        console.log(`Skipping post ${post.id}: No content to generate slug.`);
        continue;
      }
      
      // Generate slug
      const slug = await generateSlug(textToSlugify);
      
      if (!slug) {
        console.log(`Skipping post ${post.id}: Could not generate valid slug.`);
        continue;
      }
      
      // Update the post with the new slug
      await pool.query(
        'UPDATE posts SET slug = $1 WHERE id = $2',
        [slug, post.id]
      );
      
      console.log(`Updated post ${post.id} with slug: ${slug}`);
    }
    
    console.log('Finished adding slugs to existing posts.');
  } catch (error) {
    console.error('Error adding slugs:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the script
addSlugsToExistingPosts();

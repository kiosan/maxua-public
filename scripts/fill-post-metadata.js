#!/usr/bin/env node
// scripts/fill-post-metadata.js
// One-off script to fill post metadata from URL content

require('dotenv').config();
const { Pool } = require('pg');
const readline = require('readline');
const { fetchUrlMetadata } = require('../server/bluesky');

// Regular expression to find URLs in post content
const URL_REGEX = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt user for confirmation (with Y as default)
async function confirm(message) {
  return new Promise((resolve) => {
    rl.question(`${message} (Y/n): `, (answer) => {
      // If empty or starts with 'y' or 'Y', treat as yes
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === '' || normalized.startsWith('y'));
    });
  });
}

// Process a single post
async function processPost(postId) {
  console.log(`\nProcessing post ID: ${postId}`);
  
  try {
    // Step 1: Fetch the post content
    const postResult = await pool.query(
      'SELECT id, content, metadata FROM posts WHERE id = $1',
      [postId]
    );
    
    if (postResult.rows.length === 0) {
      console.error(`Error: Post with ID ${postId} not found`);
      return false;
    }
    
    const post = postResult.rows[0];
    const content = post.content;
    
    // Check if the post already has metadata
    let hasExistingMetadata = false;
    let currentMetadata = {};
    
    try {
      currentMetadata = post.metadata || {};
      if (typeof currentMetadata === 'string') {
        currentMetadata = JSON.parse(currentMetadata);
      }
      
      // Check if there's any meaningful metadata
      if (Object.keys(currentMetadata).length > 0) {
        hasExistingMetadata = true;
        console.log('Current metadata:');
        console.log(JSON.stringify(currentMetadata, null, 2));
      }
    } catch (error) {
      console.warn('Warning: Could not parse existing metadata', error);
      currentMetadata = {};
    }
    
    // Step 2: Extract URL from content
    const match = content.match(URL_REGEX);
    
    if (!match || !match[0]) {
      console.log('No URL found in post content');
      return false;
    }
    
    const url = match[0];
    console.log(`Found URL: ${url}`);
    
    // Step 3: If there's existing metadata, confirm overwrite
    if (hasExistingMetadata) {
      const shouldContinue = await confirm('Post already has metadata. Do you want to override it?');
      
      if (!shouldContinue) {
        console.log('Skipping this post.');
        return false;
      }
    }
    
    // Step 4: Fetch metadata for the URL
    console.log('Fetching metadata...');
    const metadata = await fetchUrlMetadata(url);
    
    if (!metadata) {
      console.error('Error: Failed to fetch metadata');
      return false;
    }
    
    console.log('Fetched metadata:');
    console.log(JSON.stringify(metadata, null, 2));
    
    // Step 5: Prepare the new metadata
    const newMetadata = {
      ...currentMetadata,
      url: url,
      title: metadata.title ? String(metadata.title).replace(/'/g, "'") : '',
      description: metadata.description || '',
      image_url: metadata.image || ''
    };
    
    // Final confirmation
    const confirmUpdate = await confirm('Do you want to update the post with this metadata?');
    
    if (!confirmUpdate) {
      console.log('Skipping update for this post.');
      return false;
    }
    
    // Step 6: Update the post with the new metadata
    await pool.query(
      'UPDATE posts SET metadata = $1 WHERE id = $2',
      [newMetadata, postId]
    );
    
    console.log('Success! Post metadata has been updated.');
    return true;
    
  } catch (error) {
    console.error('Error processing post:', error);
    return false;
  }
}

// Process all posts with links and empty metadata
async function processAllPosts() {
  try {
    console.log('Finding all posts with links and empty metadata...');
    
    // Get all posts
    const result = await pool.query(`
      SELECT id, content, metadata FROM posts 
      WHERE status = 'public' 
      ORDER BY id DESC
    `);
    
    console.log(`Found ${result.rows.length} total posts. Scanning for links...`);
    
    const postsWithLinks = [];
    
    // Filter posts that have links but no metadata
    for (const post of result.rows) {
      const content = post.content;
      const match = content.match(URL_REGEX);
      
      if (!match || !match[0]) {
        continue; // Skip posts without links
      }
      
      // Check if post has empty metadata or metadata without url
      let hasLinkMetadata = false;
      try {
        const metadata = post.metadata || {};
        if (typeof metadata === 'string') {
          const parsed = JSON.parse(metadata);
          hasLinkMetadata = parsed.url || parsed.image_url;
        } else {
          hasLinkMetadata = metadata.url || metadata.image_url;
        }
      } catch (error) {
        // If metadata is invalid, treat as no metadata
      }
      
      if (!hasLinkMetadata) {
        postsWithLinks.push(post.id);
      }
    }
    
    console.log(`Found ${postsWithLinks.length} posts with links that need metadata.`);
    
    if (postsWithLinks.length === 0) {
      console.log('No posts to process. Exiting.');
      return;
    }
    
    // Process each post one by one
    let processedCount = 0;
    for (let i = 0; i < postsWithLinks.length; i++) {
      const postId = postsWithLinks[i];
      console.log(`\nProcessing post ${i+1} of ${postsWithLinks.length} (ID: ${postId})`);
      
      const success = await processPost(postId);
      if (success) {
        processedCount++;
      }
    }
    
    console.log(`\nProcessing complete. Updated ${processedCount} out of ${postsWithLinks.length} posts.`);
    
  } catch (error) {
    console.error('Error processing posts:', error);
  }
}

// Main function
async function main() {
  try {
    // Check for --all argument
    const processAll = process.argv.includes('--all');
    
    if (processAll) {
      await processAllPosts();
    } else {
      // Get post ID from command line arguments
      const postId = process.argv[2];
      
      if (!postId) {
        console.error('Error: No post ID provided');
        console.log('Usage: node scripts/fill-post-metadata.js [postId] or node scripts/fill-post-metadata.js --all');
        process.exit(1);
      }
      
      await processPost(postId);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    // Close the database connection and readline interface
    rl.close();
    await pool.end();
  }
}

// Run the script
main();

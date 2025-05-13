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

// Prompt user for confirmation
async function confirm(message) {
  return new Promise((resolve) => {
    rl.question(`${message} (y/n): `, (answer) => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Main function
async function fillPostMetadata() {
  // Get post ID from command line arguments
  const postId = process.argv[2];
  
  if (!postId) {
    console.error('Error: No post ID provided');
    console.log('Usage: node scripts/fill-post-metadata.js [postId]');
    process.exit(1);
  }
  
  console.log(`Processing post ID: ${postId}`);
  
  try {
    // Step 1: Fetch the post content
    const postResult = await pool.query(
      'SELECT id, content, metadata FROM posts WHERE id = $1',
      [postId]
    );
    
    if (postResult.rows.length === 0) {
      console.error(`Error: Post with ID ${postId} not found`);
      process.exit(1);
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
      process.exit(0);
    }
    
    const url = match[0];
    console.log(`Found URL: ${url}`);
    
    // Step 3: If there's existing metadata, confirm overwrite
    if (hasExistingMetadata) {
      const shouldContinue = await confirm('Post already has metadata. Do you want to override it?');
      
      if (!shouldContinue) {
        console.log('Operation cancelled');
        process.exit(0);
      }
    }
    
    // Step 4: Fetch metadata for the URL
    console.log('Fetching metadata...');
    const metadata = await fetchUrlMetadata(url);
    
    if (!metadata) {
      console.error('Error: Failed to fetch metadata');
      process.exit(1);
    }
    
    console.log('Fetched metadata:');
    console.log(JSON.stringify(metadata, null, 2));
    
    // Step 5: Prepare the new metadata
    const newMetadata = {
      ...currentMetadata,
      url: url,
      title: metadata.title || '',
      description: metadata.description || '',
      image_url: metadata.image || ''
    };
    
    // Final confirmation
    const confirmUpdate = await confirm('Do you want to update the post with this metadata?');
    
    if (!confirmUpdate) {
      console.log('Operation cancelled');
      process.exit(0);
    }
    
    // Step 6: Update the post with the new metadata
    await pool.query(
      'UPDATE posts SET metadata = $1 WHERE id = $2',
      [newMetadata, postId]
    );
    
    console.log('Success! Post metadata has been updated.');
    
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
fillPostMetadata();

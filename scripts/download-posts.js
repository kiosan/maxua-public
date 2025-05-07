#!/usr/bin/env node
// download-posts.js - Download posts from the last N days

// Load environment variables
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

// Function to format date as "Month Day, Year"
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric'
  });
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let days = 7; // Default value
  let outputFile = 'posts.txt'; // Default output file
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--days' && i + 1 < args.length) {
      days = parseInt(args[i + 1]);
      if (isNaN(days)) {
        console.error('Error: --days requires a number');
        process.exit(1);
      }
    } else if (args[i] === '-o' && i + 1 < args.length) {
      outputFile = args[i + 1];
    }
  }
  
  return { days, outputFile };
}

// Main function
async function downloadPosts() {
  try {
    // Get arguments from command line
    const { days, outputFile } = parseArgs();
    console.log(`Downloading posts from the last ${days} days...`);

    // Query posts from the last N days
    const result = await pool.query(`
      SELECT content, created_at 
      FROM posts 
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      ORDER BY created_at DESC
    `);

    if (result.rows.length === 0) {
      console.log('No posts found in the specified time period.');
      await pool.end();
      return;
    }

    // Create output file stream
    const outputStream = fs.createWriteStream(outputFile);

    // Group posts by date
    const postsByDate = {};
    
    result.rows.forEach(post => {
      const date = formatDate(post.created_at);
      if (!postsByDate[date]) {
        postsByDate[date] = [];
      }
      postsByDate[date].push(post.content);
    });

    // Write posts to file, grouped by date
    const dates = Object.keys(postsByDate);
    
    dates.forEach((date, dateIndex) => {
      // Write date header
      outputStream.write(`${date}\n\n`);
      
      // Write posts for this date
      const posts = postsByDate[date];
      posts.forEach((postContent, postIndex) => {
        // Add post content
        outputStream.write(`${postContent}\n\n`);
        
        // Add delimiter between posts from the same date (except for the last one)
        if (postIndex < posts.length - 1) {
          outputStream.write('---\n\n');
        }
      });
      
      // No need for a delimiter between dates, as the date itself serves as a delimiter
    });

    outputStream.end();
    console.log(`Successfully downloaded ${result.rows.length} posts to ${outputFile}`);
  } catch (error) {
    console.error('Error downloading posts:', error);
  } finally {
    // Close database connection
    await pool.end();
  }
}

// Run the script
downloadPosts();

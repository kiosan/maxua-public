// test-scheduled-posts.js
// A script to test the scheduled posts API locally

require('dotenv').config();
const fetch = require('node-fetch');

// Replace with your actual values
const BASE_URL = 'http://localhost:8888'; // When using netlify dev
const SESSION_ID = ''; // Your valid session ID

// Example functions for testing

async function schedulePost() {
  const response = await fetch(`${BASE_URL}/api/scheduledPosts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      content: 'This is a scheduled test post ' + new Date().toISOString(),
      // Schedule for 5 minutes from now for testing
      scheduled_for: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      share_telegram: true,
      share_bluesky: false
    })
  });

  if (!response.ok) {
    console.error(`Error: ${response.status}`);
    console.error(await response.text());
    return;
  }

  const result = await response.json();
  console.log('Scheduled post created:', result);
  return result;
}

async function getScheduledPosts() {
  const response = await fetch(`${BASE_URL}/api/scheduledPosts?sessionId=${SESSION_ID}`);
  
  if (!response.ok) {
    console.error(`Error: ${response.status}`);
    console.error(await response.text());
    return;
  }

  const posts = await response.json();
  console.log('Scheduled posts:', posts);
  return posts;
}

async function publishScheduledPosts() {
  // You'll need to set the SCHEDULED_POSTS_API_KEY in your .env file
  const API_KEY = process.env.SCHEDULED_POSTS_API_KEY;
  
  if (!API_KEY) {
    console.error('SCHEDULED_POSTS_API_KEY not set in .env file');
    return;
  }

  const response = await fetch(`${BASE_URL}/api/publishScheduled`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': API_KEY
    },
    body: JSON.stringify({ limit: 1 })
  });

  if (!response.ok) {
    console.error(`Error: ${response.status}`);
    console.error(await response.text());
    return;
  }

  const result = await response.json();
  console.log('Publish result:', result);
  return result;
}

// Run the tests
async function runTests() {
  try {
    console.log('===== Creating a scheduled post =====');
    await schedulePost();
    
    console.log('\n===== Getting all scheduled posts =====');
    await getScheduledPosts();
    
    console.log('\n===== Testing publish endpoint =====');
    console.log('(Note: This might not publish any posts if none are due)');
    await publishScheduledPosts();
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTests();

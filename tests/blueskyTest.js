// functions/blueskyTest.js
// A simple test function to verify Bluesky integration

const { sharePostToBluesky } = require('./bluesky');
const { wrap } = require('./utils');

exports.handler = wrap(async (event, context, headers) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse the request body
    const body = JSON.parse(event.body || '{}');
    const message = body.message || 'Test post from maxua.com';

    // Create a simple mock post object (no ID needed for testing)
    const mockPost = {
      content: message
    };

    // Send test post to Bluesky
    const result = await sharePostToBluesky(mockPost);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Post shared to Bluesky',
        blueskyResponse: result 
      })
    };
  } catch (error) {
    console.error('Error in blueskyTest:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to share post to Bluesky',
        details: error.message
      })
    };
  }
});

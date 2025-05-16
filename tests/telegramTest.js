// functions/telegramTest.js
// A simple test function to verify Telegram integration

const { sendTelegramMessage } = require('./telegram');
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
    const message = body.message || 'Test message from sbondar.com';

    // Send test message to Telegram
    const result = await sendTelegramMessage(message);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Message sent to Telegram',
        telegramResponse: result 
      })
    };
  } catch (error) {
    console.error('Error in telegramTest:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to send message to Telegram',
        details: error.message
      })
    };
  }
});

// functions/subscribe.js
const { pool, wrap, getCorsHeaders } = require('./utils');
const { v4: uuidv4 } = require('uuid');
const { sendEmail } = require('./sendEmail');
const { render } = require('./templateEngine');

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
    const body = JSON.parse(event.body || '{}');
    const { email, name } = body;

    // Validate email
    if (!email || !isValidEmail(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid email is required' })
      };
    }

    // Check if email already exists
    const existingResult = await pool.query(
      'SELECT id, confirmed FROM subscribers WHERE email = $1',
      [email]
    );

    if (existingResult.rows.length > 0) {
      const subscriber = existingResult.rows[0];
      
      // If already confirmed, just return success
      if (subscriber.confirmed) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: 'You are already subscribed to Max Ischenko\'s blog.',
            alreadySubscribed: true
          })
        };
      }
      
      // If not confirmed, generate new confirmation token and send again
      const confirmationToken = uuidv4();
      
      await pool.query(
        'UPDATE subscribers SET confirmation_token = $1, created_at = NOW() WHERE id = $2',
        [confirmationToken, subscriber.id]
      );
      
      // Send confirmation email
      await sendConfirmationEmail(email, name || '', confirmationToken);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: 'Please check your email to confirm your subscription.',
          needsConfirmation: true
        })
      };
    }

    // New subscriber - generate tokens
    const confirmationToken = uuidv4();
    const unsubscribeToken = uuidv4();

    // Insert into subscribers table
    await pool.query(
      'INSERT INTO subscribers (email, name, confirmation_token, unsubscribe_token) VALUES ($1, $2, $3, $4)',
      [email, name || null, confirmationToken, unsubscribeToken]
    );

    // Send confirmation email
    await sendConfirmationEmail(email, name || '', confirmationToken);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Please check your email to confirm your subscription.'
      })
    };
  } catch (error) {
    console.error('Error in subscribe function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server error' })
    };
  }
});

/**
 * Send a confirmation email to the subscriber
 */
async function sendConfirmationEmail(email, name, token) {
  const confirmUrl = `https://maxua.com/api/confirmSubscription?token=${token}`;
  const greeting = name ? `Hi ${name},` : 'Hi there,';
  
  // You might want to create a proper email template, but for now let's use a simple HTML string
  const html = `
  <!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Subscription</title>
</head>
<body style="margin: 0; padding: 0; width: 100%; text-align: left;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-spacing: 0; margin: 0; padding: 0;">
    <tr>
      <td align="left" style="padding: 0; margin: 0;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-spacing: 0; margin: 0; padding: 20px 0;">
          <tr>
            <td align="left" style="padding: 0; margin: 0; text-align: left; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333;">
              
              <p style="margin: 0 0 20px 0; padding: 0; text-align: left;">${greeting}</p>
              
              <p style="margin: 0 0 20px 0; padding: 0; text-align: left;">Thank you for subscribing to Max Ischenko's blog.</p>
              
              <p style="margin: 0 0 20px 0; padding: 0; text-align: left;">Please confirm your subscription by clicking the button below:</p>
              
              <div style="margin: 15px 0; padding: 0; text-align: left;">
                <a href="${confirmUrl}" style="background-color: #0366d6; color: white; text-decoration: none; display: inline-block; padding: 8px 20px; border-radius: 4px; font-weight: 500; font-size: 14px;">Confirm Subscription</a>
              </div>
              
              <p style="margin: 0 0 20px 0; padding: 0; text-align: left;">Or copy and paste this link into your browser: ${confirmUrl}</p>
              
              <p style="margin: 0; padding: 0; text-align: left; color: #666; font-size: 14px;">If you didn't subscribe to this blog, you can safely ignore this email.</p>
              
              <div style="margin: 30px 0 0 0; padding: 0; text-align: left; color: #666; font-size: 14px;">
                Best,<br>
                Max Ischenko
              </div>
              
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail({
    to: email,
    subject: 'Confirm your subscription to Max Ischenko\'s blog',
    text: `${greeting}\n\nThank you for subscribing to Max Ischenko\'s blog.\n\nPlease confirm your subscription by clicking this link: ${confirmUrl}\n\nIf you didn't subscribe to this blog, you can safely ignore this email.\n\nBest,\nMax Ischenko`,
    html
  });
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

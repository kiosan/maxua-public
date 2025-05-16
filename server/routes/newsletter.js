// routes/newsletter.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db, runQuery, rateLimiterMiddleware, sendEmail } = require('../utils');

// Subscribe to the newsletter
router.post('/subscribe', rateLimiterMiddleware, async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Check if email already exists
    const existingResult = await runQuery(
      'SELECT id, confirmed FROM subscribers WHERE email = ?',
      [email]
    );
    
    if (existingResult.rows.length > 0) {
      const subscriber = existingResult.rows[0];

      if (subscriber.confirmed) {
        return res.json({ 
          success: true, 
          message: 'You are already subscribed!',
          alreadySubscribed: true
        });
      }
      
      // If not confirmed, generate new confirmation token and send again
      const confirmationToken = uuidv4();
      
      await runQuery(
        "UPDATE subscribers SET confirmation_token = ?, created_at = datetime('now') WHERE id = ?",
        [confirmationToken, subscriber.id]
      );
      
      // Send confirmation email
      await sendConfirmationEmail(email, confirmationToken);
      
      return res.json({ 
        success: true, 
        message: 'Please check your email to confirm your subscription.',
        needsConfirmation: true
      });

    } // already existing subscriber 

    // New subscriber - generate tokens
    const confirmationToken = uuidv4();
    const unsubscribeToken = uuidv4();

    // Insert into subscribers table
    await runQuery(
      'INSERT INTO subscribers (email, confirmation_token, unsubscribe_token) VALUES (?, ?, ?)',
      [email, confirmationToken, unsubscribeToken]
    );

    // Send confirmation email
    await sendConfirmationEmail(email, confirmationToken);

    return res.json({ 
      success: true, 
      message: 'Please check your email to confirm your subscription.'
    });
  } catch (error) {
    console.error('Error in subscribe function:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Confirm subscription
router.get('/confirmSubscription', async (req, res) => {
  try {
    const token = req.query.token;
    
    if (!token) {
      return res.status(400).send(generateHtmlResponse(
        'Error',
        'Invalid request. Missing confirmation token.'
      ));
    }

    // Look up the subscription by confirmation token
    const result = await runQuery(
      'SELECT id, email FROM subscribers WHERE confirmation_token = ?',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).send(generateHtmlResponse(
        'Invalid Confirmation Link',
        'The confirmation link you clicked is invalid or has expired.'
      ));
    }

    const subscriber = result.rows[0];

    // Mark subscription as confirmed and clear the confirmation token
    await runQuery(
      'UPDATE subscribers SET confirmed = true, confirmation_token = NULL WHERE id = ?',
      [subscriber.id]
    );
    
    // Send notification email to admin
    await sendNotificationEmail(subscriber.email);

    return res.status(200).send(generateHtmlResponse(
      'Thank you for subscribing!',
      `<p>You will now receive my daily email digest with new posts.</p>
       <p><a href="https://sbondar.com">Back to the blog</a></p>`
    ));
  } catch (error) {
    console.error('Error confirming subscription:', error);
    return res.status(500).send(generateHtmlResponse(
      'Error',
      'There was an error processing your request. Please try again later.'
    ));
  }
});

// Unsubscribe from newsletter
router.get('/unsubscribe', async (req, res) => {
  try {
    const token = req.query.token;
    
    if (!token) {
      return res.status(400).send(generateHtmlResponse(
        'Invalid Unsubscribe Link',
        'The unsubscribe link you clicked is invalid or has expired.'
      ));
    }

    // Look up the subscription by unsubscribe token
    const result = await runQuery(
      'SELECT id, email FROM subscribers WHERE unsubscribe_token = ?',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).send(generateHtmlResponse(
        'Invalid Unsubscribe Link',
        'The unsubscribe link you clicked is invalid or has expired.'
      ));
    }

    const subscriber = result.rows[0];

    // Delete the subscription
    await runQuery(
      'DELETE FROM subscribers WHERE id = ?',
      [subscriber.id]
    );

    return res.status(200).send(generateHtmlResponse(
      'Successfully Unsubscribed',
      `<p>You have been successfully unsubscribed from email updates.</p>
       <p>We're sorry to see you go! If you'd like to resubscribe in the future, you can do so at any time.</p>
       <p><a href="https://sbondar.com">Return to the blog</a></p>`
    ));
  } catch (error) {
    console.error('Error handling unsubscribe:', error);
    return res.status(500).send(generateHtmlResponse(
      'Error',
      'There was an error processing your request. Please try again later.'
    ));
  }
});

// Helper function for email validation
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Helper function to send confirmation email
async function sendConfirmationEmail(email, token) {
  const confirmUrl = `https://sbondar.com/api/confirmSubscription?token=${token}`;
  const greeting = 'Welcome!';

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
              
              <p style="margin: 0 0 20px 0; padding: 0; text-align: left;">Click below to confirm&mdash;or use <a href="${confirmUrl}">this link</a>
              </p>
              
              <div style="margin: 15px 0; padding: 0; text-align: left;">
                <a href="${confirmUrl}" style="background-color: #0366d6; color: white; text-decoration: none; display: inline-block; padding: 8px 20px; border-radius: 4px; font-weight: 500; font-size: 14px;">Confirm Subscription</a>
              </div>

              <div style="margin: 30px 0 0 0; padding: 0; text-align: left; color: #666; font-size: 14px;">
                Best,<br>
                Max
                <br><br>
                ps: any questions? just reply to this email ;-)
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
    subject: 'Confirm your subscription',
    reply_to: 'obondar@gmail.com',
    text: `${greeting}\n\nWelcome!\n\nPlease follow this link to confirm: ${confirmUrl}\n\nIf you didn't subscribe to this blog, you can safely ignore this email.\n\nBest,\nMax`,
    html
  });
}

// Helper function to send notification email to admin
async function sendNotificationEmail(subscriberEmail) {
  try {
    const subject = `New subscriber on sbondar.com`;
    const text = `\n\nEmail: ${subscriberEmail}`;
    
    await sendEmail({
      to: 'obondar@gmail.com', 
      subject,
      text
    });
    
    console.log(`Notification email sent for subscriber: ${subscriberEmail}`);
  } catch (error) {
    // Log the error but don't stop the confirmation process
    console.error('Error sending notification email:', error);
  }
}

// Helper function to generate HTML response for subscription pages
function generateHtmlResponse(title, content) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Sasha Bondar</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 40px auto;
      padding: 20px;
      text-align: center;
    }
    .container {
      background-color: #fff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    h1 {
      font-size: 24px;
      margin-bottom: 20px;
    }
    p {
      margin-bottom: 15px;
    }
    a {
      color: #1a73e8;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    ${content}
  </div>
</body>
</html>`;
}

module.exports = router;

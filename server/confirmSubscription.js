// functions/confirmSubscription.js
const { pool, wrap, getCorsHeaders } = require('./utils');
const { sendEmail } = require('./sendEmail');

exports.handler = wrap(async (event, context, headers) => {
  // Only handle GET requests with a token
  if (event.httpMethod !== 'GET' || !event.queryStringParameters?.token) {
    return {
      statusCode: 400,
      headers: {
        ...headers,
        'Content-Type': 'text/html; charset=UTF-8'
      },
      body: generateHtmlResponse(
        'Error',
        'Invalid request. Missing confirmation token.'
      )
    };
  }

  try {
    const token = event.queryStringParameters.token;
    
    // Look up the subscription by confirmation token
    const result = await pool.query(
      'SELECT id, email, name FROM subscribers WHERE confirmation_token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return {
        statusCode: 400,
        headers: {
          ...headers,
          'Content-Type': 'text/html; charset=UTF-8'
        },
        body: generateHtmlResponse(
          'Invalid Confirmation Link',
          'The confirmation link you clicked is invalid or has expired.'
        )
      };
    }

    const subscriber = result.rows[0];

    // Mark subscription as confirmed and clear the confirmation token
    await pool.query(
      'UPDATE subscribers SET confirmed = true, confirmation_token = NULL WHERE id = $1',
      [subscriber.id]
    );
    
    // Send notification email to admin
    await sendNotificationEmail(subscriber.email, subscriber.name);

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'text/html; charset=UTF-8'
      },
      body: generateHtmlResponse(
        'Subscription Confirmed',
        `<p>Thank you for subscribing to Max Ischenko's blog!</p>
         <p>You will now receive email updates when new posts are published.</p>
         <p><a href="https://maxua.com">Return to the blog</a></p>`
      )
    };
  } catch (error) {
    console.error('Error confirming subscription:', error);
    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'text/html; charset=UTF-8'
      },
      body: generateHtmlResponse(
        'Error',
        'There was an error processing your request. Please try again later.'
      )
    };
  }
});

/**
 * Send a notification email to the admin when a new subscription is confirmed
 * @param {string} subscriberEmail - The email of the new subscriber
 * @param {string} subscriberName - The name of the new subscriber (if provided)
 */
async function sendNotificationEmail(subscriberEmail, subscriberName) {
  try {
    const nameInfo = subscriberName ? ` (${subscriberName})` : '';
    const subject = `New subscriber on maxua.com`;
    const text = `\n\nEmail: ${subscriberEmail}${nameInfo}\n\nTime: ${new Date().toLocaleString()}`;
    
    await sendEmail({
      to: 'ischenko@gmail.com', 
      subject,
      text
    });
    
    console.log(`Notification email sent for subscriber: ${subscriberEmail}`);
  } catch (error) {
    // Log the error but don't stop the confirmation process
    console.error('Error sending notification email:', error);
  }
}

/**
 * Generate an HTML response
 */
function generateHtmlResponse(title, content) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Max Ischenko</title>
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

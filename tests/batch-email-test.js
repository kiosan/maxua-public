// tests/batch-email-test.js
// Test script to verify Resend batch email sending

require('dotenv').config();
const { Resend } = require('resend');

// Initialize Resend with your API key (should be in .env file)
const resend = new Resend(process.env.RESEND_API_KEY);

// Test data
const testPost = {
  id: 9999,
  content: "Bring the power of Netlify directly to your local machine. Build, test, and debug your functions locally before you deploy.",
  created_at: new Date().toISOString()
};

// Format date for display (simplified version)
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { 
    year: 'numeric', 
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Kyiv'
  });
}

// Send a test batch email
async function testBatchEmail() {
  try {
    console.log('🧪 Testing batch email sending...');

    // Prepare variables
    const postUrl = `https://maxua.com/p/${testPost.id}`;
    const formattedDate = formatDate(testPost.created_at);
    
    // Create HTML template (using a simpler approach for the test)
    const createHTML = (unsubscribeUrl) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>[TEST] Batch Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; text-align: left; color: #222;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0; padding: 0;">
    <tr>
      <td align="left" valign="top" style="padding: 0;">
        <div style="width: 100%; max-width: 550px; margin: 0; padding: 0 0 0 0;">
          <div style="margin: 20px 0; padding: 0 15px 0 0; font-size: 17px; line-height: 1.6; text-align: left;">
            ${testPost.content.replace(/\n/g, '<br>')}
          </div>
          
          <div style="margin-top: 15px; padding: 0 15px 0 0; color: #555; font-size: 14px; font-style: italic; text-align: left;">
            ${formattedDate}
          </div>
          
          <div style="margin-top: 15px; padding: 0 15px 0 0; text-align: left;">
            <a href="${postUrl}" style="color: #0366d6; text-decoration: none; font-weight: 600; font-size: 16px;">Обговорення</a>
          </div>
          
          <div style="margin-top: 30px; padding: 20px 15px 0 0; border-top: 1px solid #eee; color: #666; font-size: 13px; text-align: left;">
            <div style="text-align: left;">You're receiving this email because you subscribed to updates from Sasha Bondar.</div>
            <div style="margin-top: 10px; font-size: 12px; color: #999; text-align: left;">
              <a href="${unsubscribeUrl}" style="color: #999; text-decoration: none; text-align: left;">Unsubscribe</a> from these emails.
            </div>
            <div style="margin-top: 10px; padding: 10px; background-color: #f8f8f8; border: 1px dashed #ddd;">
              <strong>TEST EMAIL</strong> - This is a test of the batch email system.
            </div>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Create plain text version
    const createText = (unsubscribeUrl) => `[TEST] Batch email from Sasha Bondar

${testPost.content}

Read more: ${postUrl}

To unsubscribe: ${unsubscribeUrl}

TEST EMAIL - This is a test of the batch email system.`;

    // Create batch emails - Resend expects an array of complete email objects
    const emailBatch = [
      {
        from: 'Sasha Bondar <hello@maxua.com>',
        to: ['obondar@gmail.com'], // Your email
        reply_to: 'obondar@gmail.com',
        subject: '[TEST] Batch Email 1',
        html: createHTML('https://maxua.com/api/unsubscribe?token=test-token-1'),
        text: createText('https://maxua.com/api/unsubscribe?token=test-token-1')
      },
      {
        from: 'Sasha Bondar <hello@sbondar.com>',
        to: ['obondar@gmail.com'], // Another test email
        reply_to: 'obondar@gmail.com',
        subject: '[TEST] Batch Email 2',
        html: createHTML('https://sbondar.com/api/unsubscribe?token=test-token-2'),
        text: createText('https://sbondar.com/api/unsubscribe?token=test-token-2')
      }
    ];

    console.log(`Sending test batch with ${emailBatch.length} emails...`);

    // Send the batch email
    const { data, error } = await resend.batch.send(emailBatch);

    if (error) {
      console.error('❌ Batch email error:', error);
      return;
    }

    console.log('✅ Batch email sent successfully!');
    console.log('Results:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Error in testBatchEmail:', error);
  }
}

// Run the test
testBatchEmail();

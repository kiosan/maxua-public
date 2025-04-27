// tests/test-email-delivery.js
require('dotenv').config();
const { Resend } = require('resend');
const fs = require('fs');
const Handlebars = require('handlebars');
const path = require('path');

// Mock pool for testing (to avoid database dependencies)
const pool = {
  query: async (query, params) => {
    console.log(`[MOCK DB] Query: ${query.substring(0, 50)}...`);
    console.log(`[MOCK DB] Params: ${JSON.stringify(params)}`);
    
    if (query.includes('INSERT INTO email_deliveries')) {
      return { rows: [{ id: 999 }] }; // Mock delivery ID
    }
    return { rows: [] };
  }
};

// Simple formatDate function
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

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Mock render function
function render(templateName, data) {
  console.log(`[MOCK RENDER] Rendering template: ${templateName}`);
  
  // Read the actual template
  try {
    const templatePath = path.join(__dirname, '..', 'fly-api', `${templateName}.hbs`);
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = Handlebars.compile(templateSource);
    return template(data);
  } catch (err) {
    console.error(`Error loading template: ${err.message}`);
    // Fallback simple template
    return `
      <html>
        <body>
          <h1>Test Email</h1>
          <p>${data.post.content}</p>
          <p>Date: ${data.post.formatted_date}</p>
          <p><a href="${data.postUrl}">Read more</a></p>
          <p><a href="%%unsubscribeUrl%%">Unsubscribe</a></p>
        </body>
      </html>
    `;
  }
}

// Test mock data
const testPost = {
  id: 9999,
  content: "This is a test of the new batch email delivery system. If this were a real post, it would contain meaningful content.",
  created_at: new Date().toISOString(),
  topic_name: "Testing",
  topic_slug: "testing"
};

// Test subscribers (your test email addresses)
const testSubscribers = [
  { id: 1, email: "ischenko@gmail.com", name: "Max Test 1", unsubscribe_token: "test-token-1" },
  { id: 2, email: "max@dou.ua", name: "Max Test 2", unsubscribe_token: "test-token-2" }
];

/**
 * Test version of sharePostToEmail
 */
async function testSharePostToEmail(post, subscribers) {
  console.log(`📧 Testing batch email to ${subscribers.length} subscribers for post ${post.id}`);

  // Format subject line
  let subject = "[TEST] " + post.content;
  if (subject.length > 40) {
    const truncateAt = subject.lastIndexOf(' ', 37);
    subject = subject.substring(0, truncateAt > 0 ? truncateAt : 37) + '...';
  }
  subject = subject.replace(/\n/g, ' ').trim();
  let sentCount = 0;

  try {
    // Prepare common data
    const postUrl = `https://maxua.com/p/${post.id}`;
    const topicName = post.topic_name || null;
    
    // Render the base template
    const baseHtml = render('email-post', { 
      post: {
        ...post,
        content: post.content.replace(/\n/g, '<br>'),
        formatted_date: formatDate(post.created_at)
      },
      topicName,
      postUrl
    });

    // Create batch emails
    const emailBatch = subscribers.map(subscriber => {
      const unsubscribeUrl = `https://maxua.com/api/unsubscribe?token=${subscriber.unsubscribe_token}`;
      
      // Replace the placeholder in the template
      const html = baseHtml.replace('%%unsubscribeUrl%%', unsubscribeUrl);
      
      // Plain text version
      const text = `[TEST] New post from Max Ischenko:

${post.content}

Read more: ${postUrl}

To unsubscribe: ${unsubscribeUrl}`;
      
      return {
        from: 'Max Ischenko <hello@maxua.com>',
        to: [subscriber.email],
        reply_to: 'ischenko@gmail.com',
        subject: subject,
        html: html,
        text: text,
        metadata: {
          post_id: post.id,
          subscriber_id: subscriber.id,
          test: true
        }
      };
    });
    
    console.log(`Sending batch with ${emailBatch.length} emails...`);
    
    // Send the batch email
    const { data, error } = await resend.batch.send(emailBatch);
    
    if (error) {
      console.error('❌ Batch email error:', error);
      return {
        success: false,
        error: error.message
      };
    }
    
    console.log('✅ Batch email sent successfully!');
    console.log('Results:', JSON.stringify(data, null, 2));

    const batchSuccessCount = data.data && Array.isArray(data.data)
  ? data.data.filter(item => item.id).length
  : 0;
    sentCount += batchSuccessCount;
    
    return {
      success: true,
      sentCount
    };
    
  } catch (error) {
    console.error('❌ Error in email delivery test:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
async function runTest() {
  console.log('🧪 Testing new emailDelivery implementation...');
  const result = await testSharePostToEmail(testPost, testSubscribers);
  console.log('Test complete!', result);
}

runTest();

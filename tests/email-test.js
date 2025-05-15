// email-test.js
// Test script to send emails using your template

require('dotenv').config();
const { Resend } = require('resend');
const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

// Initialize Resend with your API key (should be in .env file)
const resend = new Resend(process.env.RESEND_API_KEY);

// Test post data
const testPost = {
  id: 9999,
  content: "Bring the power of Netlify directly to your local machine. Build, test, and debug your functions locally before you deploy. Run the commands in your terminal from the root of your linked repository.",
  created_at: new Date().toISOString(),
  topic_name: "Testing",
  topic_slug: "testing",
  formatted_date: "17/4/2025, 16:28:46"
};

// Load and compile the template
async function loadTemplate() {
  try {
    const templatePath = path.join(__dirname, '..', 'functions', 'email-post.hbs');
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    return Handlebars.compile(templateSource);
  } catch (error) {
    console.error('Error loading template:', error);
    throw error;
  }
}

// Send test email
async function sendTestEmail() {
  try {
    // Load the template
    const template = await loadTemplate();
    
    // Prepare data for the template
    const postUrl = `https://maxua.com/p/${testPost.id}`;
    const topicName = testPost.topic_name;
    
    // Render the HTML with the test data
    const htmlContent = template({
      post: {
        ...testPost,
        content: testPost.content.replace(/\n/g, '<br>')
      },
      topicName,
      postUrl
    });
  
    let subject = testPost.content;

    if (subject.length > 40) {
      // Try to cut at a space, not mid-word
      const truncateAt = subject.lastIndexOf(' ', 37);
      subject = subject.substring(0, truncateAt > 0 ? truncateAt : 37) + '...';
    }

    const randomNum = Date.now() % 100000;
    
    // Replace the unsubscribe placeholder
    const finalHtml = htmlContent.replace('%%unsubscribeUrl%%', 'https://sbondar.com/unsubscribe?token=test-token');
    
    // Send the email
    const { data, error } = await resend.emails.send({
      from: 'Sasha Bondar <hello@sbondar.com>',
      to: 'obondar@gmail.com',
      subject: `[TEST]: ${subject}`,
      html: finalHtml,
      text: `TEST EMAIL\n\n${testPost.content}\n\nRead more: ${postUrl}\n\nTo unsubscribe: https://sbondar.com/unsubscribe?token=test-token`
    });
    
    if (error) {
      console.error('Error sending email:', error);
      return;
    }
    
    console.log('Test email sent successfully!');
    console.log('Message ID:', data.id);
  } catch (error) {
    console.error('Error in sendTestEmail:', error);
  }
}

// Run the test
sendTestEmail();

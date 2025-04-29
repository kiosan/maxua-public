// tests/test-weekly-digest.js
require('dotenv').config();
const { sendWeeklyDigest } = require('../server/weeklyDigest');
const fs = require('fs');
const path = require('path');

/**
 * Test script for the weekly digest feature
 * Tests and previews the weekly digest email functionality
 */
async function testWeeklyDigest() {
  console.log('🧪 Testing weekly digest email...');
  
  // Get command line arguments
  const args = process.argv.slice(2);
  const testOptions = {
    testEmail: 'ischenko@gmail.com', // Default test email
    daysBack: 7, // Default days back
    dryRun: true, // Default to dry run for safety
    save: false // Whether to save the HTML preview to a file
  };

  // Parse arguments
  args.forEach(arg => {
    if (arg.startsWith('--email=')) {
      testOptions.testEmail = arg.replace('--email=', '');
    }
    if (arg.startsWith('--days=')) {
      testOptions.daysBack = parseInt(arg.replace('--days=', ''));
    }
    if (arg === '--send') {
      testOptions.dryRun = false;
    }
    if (arg === '--save') {
      testOptions.save = true;
    }
  });

  console.log(`Test configuration:
  - Email: ${testOptions.testEmail}
  - Days back: ${testOptions.daysBack}
  - Dry run: ${testOptions.dryRun}
  - Save preview: ${testOptions.save}
  `);

  try {
    // Run the digest with test options
    const result = await sendWeeklyDigest({
      testEmail: testOptions.testEmail,
      daysBack: testOptions.daysBack,
      dryRun: testOptions.dryRun
    });

    console.log('Weekly digest test result:', result);

    // Save preview to file if requested
    if (testOptions.save && result.htmlPreview) {
      const previewPath = path.join(__dirname, 'digest-preview.html');
      fs.writeFileSync(previewPath, result.htmlPreview);
      console.log(`Preview saved to: ${previewPath}`);
    }

    // If we find posts but it's a dry run, show summary
    if (result.status === 'dry_run' && result.posts) {
      console.log(`\nFound ${result.posts.length} posts for the digest:`);
      result.posts.forEach((post, i) => {
        const preview = post.content.substring(0, 60) + (post.content.length > 60 ? '...' : '');
        console.log(`${i+1}. ID: ${post.id} - "${preview}" (${post.formatted_date})`);
      });
    }

    // If test actually sent emails, show confirmation
    if (!testOptions.dryRun && result.success) {
      console.log(`✅ Test email sent to ${testOptions.testEmail}`);
    }

    process.exit(0); // so we don't mess with closing db connections

  } catch (error) {
    console.error('❌ Error testing weekly digest:', error);
    process.exit(1);
  }
}

// Run the test
testWeeklyDigest();

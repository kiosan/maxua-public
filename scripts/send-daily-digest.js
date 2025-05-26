#!/usr/bin/env node
// scripts/send-daily-digest.js
// Script to send daily digest email - designed to be called by a cron job

require('dotenv').config();
const { sendDailyDigest } = require('../server/dailyEmail');

/**
 * Main function to send the daily digest
 * Can be executed directly by a cron job
 */
async function main() {
  console.log(`Starting daily digest send at ${new Date().toISOString()}`);

  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    const options = {
      maxPosts: 'all', // Default to all (within hardcorded limit)
      dryRun: false, // Real run by default when called via cron
      askForSubject: false, // Don't ask for subject by default
      customSubject: null // No custom subject by default
    };

    // Parse arguments - allows overrides when called manually
    args.forEach(arg => {
      if (arg.startsWith('--max=')) {
        options.maxPosts = parseInt(arg.replace('--max=', ''));
      }
      if (arg === '--dry-run') {
        options.dryRun = true;
      }
      if (arg === '--ask-for-subject') {
        options.askForSubject = true;
      }
      if (arg.startsWith('--subject=')) {
        options.customSubject = arg.replace('--subject=', '');
      }
      if (arg.startsWith('--test')) {
        options.testEmail = 'obondar@gmail.com';
      }
    });

    console.log(`Sending daily digest with options:
    - Max posts: ${options.maxPosts}
    - Dry run: ${options.dryRun}
    - Ask for subject: ${options.askForSubject}
    - Custom subject: ${options.customSubject || 'None'}
    - Test email: ${options.testEmail || 'None (sending to all subscribers)'}
    `);

    // Send the digest
    const result = await sendDailyDigest(options);
    
    if (!result.success && result.status !== 'skipped') {
      console.error(`❌ Failed to send daily digest: ${result.error || 'Unknown error'}`);
      console.error(result);
      process.exit(1);
    }

    if (result.status === 'skipped') {
      console.log(`⏭️ Daily digest skipped: ${result.reason}`);
      process.exit(0);
    }

    if (options.dryRun) {
      console.log(`✅ [DRY RUN] Email would be sent to ${result.subscriberCount} subscribers`);
    } else {
      console.log(`✅ Daily digest sent successfully to ${result.sentCount}/${result.subscriberCount} subscribers`);
    }
    console.log(`Subject: "${result.subject}"`);
    
    if (options.dryRun) {
      console.log('No emails were actually sent (dry run mode)');
    }
    process.exit(0);

  } catch (error) {
    console.error('❌ Error in daily digest:', error);
    process.exit(1);
  }
}

// Execute the main function
main();

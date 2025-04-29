#!/usr/bin/env node
// scripts/send-weekly-digest.js
// Script to send weekly digest email - designed to be called by a cron job

require('dotenv').config();

const { sendWeeklyDigest } = require('../server/weeklyDigest');

/**
 * Main function to send the weekly digest
 * Can be executed directly by a cron job
 */
async function main() {
  console.log(`Starting weekly digest send at ${new Date().toISOString()}`);

  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    const options = {
      daysBack: 7, // Default days back
      dryRun: false // Real run by default when called via cron
    };

    // Parse arguments - allows overrides when called manually
    args.forEach(arg => {
      if (arg.startsWith('--days=')) {
        options.daysBack = parseInt(arg.replace('--days=', ''));
      }
      if (arg === '--dry-run') {
        options.dryRun = true;
      }
    });

    console.log(`Sending weekly digest with options:
    - Days back: ${options.daysBack}
    - Dry run: ${options.dryRun}
    `);

    // Send the digest
    const result = await sendWeeklyDigest(options);
    
    // console.log('Weekly digest result:', result);

    if (!result.success) {
      console.error(`❌ Failed to send weekly digest: ${result.error || 'Unknown error'}`);
      process.exit(1);
    }

    console.log(`✅ Weekly digest sent successfully to ${result.sentCount} subscribers`);
    process.exit(0);

  } catch (error) {
    console.error('❌ Error in weekly digest:', error);
    process.exit(1);
  }
}

// Execute the main function
main();

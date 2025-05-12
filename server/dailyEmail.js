// server/dailyEmail.js - Daily digest email sender
const { Resend } = require('resend');
const { pool, formatDate, escapeHTML } = require('./utils');
const { render } = require('./templateEngine');
const readline = require('readline');

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send a daily digest email to all subscribers
 *
 * Date logic: 
 *  1. Do not include today 
 *  2. Calculate range using daysBack-from midnight till midnight
 * 
 * This way there is no risk of missing a post-you're always fetch full
 * days worth of posts regardless of what time the digest is run at.
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.testEmail - If set, only send to this email for testing
 * @param {number} options.daysBack - How many days of posts to include (default: 1)
 * @param {boolean} options.dryRun - If true, don't actually send emails
 * @param {boolean} options.askForSubject - If true, prompt for subject selection
 * @returns {Promise<Object>} - Result of the operation
 */
async function sendDailyDigest(options = {}) {
  const {
    testEmail = null,
    daysBack = 1,
    dryRun = false,
    askForSubject = false,
    customSubject = null
  } = options;

  // Date range calculation--doesn't include today
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);
  endDate.setHours(23, 59, 59, 999); 
  
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (daysBack - 1));
  startDate.setHours(0, 0, 0, 0); 

  try {
    // 1. Get posts from the specified date range
    const posts = await getRecentPosts(startDate, endDate);
    
    if (posts.length === 0) {
      console.log(`No posts in the last ${daysBack} days, skipping digest`);
      return {
        success: true,
        status: 'skipped',
        reason: 'no_posts'
      };
    }
    
    console.log(`Found ${posts.length} posts for the daily digest`);
    
    // 2. Get confirmed subscribers
    let subscribers = [];
    
    if (testEmail) {
      // Test mode - only send to the test email
      subscribers = [{
        id: 0,
        email: testEmail,
        name: 'Test User',
        unsubscribe_token: 'test-token'
      }];
      console.log(`Test mode: Will send only to ${testEmail}`);
    } else {
      // Get actual subscribers - include both preferences to simplify migration
      const subscribersResult = await pool.query(`
        SELECT id, email, name, unsubscribe_token 
        FROM subscribers 
        WHERE confirmed = true AND (preferences = 'digest' OR preferences = 'single-post')
      `);
      subscribers = subscribersResult.rows;
      console.log(`Found ${subscribers.length} confirmed subscribers`);
    }
    
    if (subscribers.length === 0) {
      console.log('No subscribers found, skipping digest');
      return {
        success: true,
        status: 'skipped',
        reason: 'no_subscribers'
      };
    }
    
    // 3. Format posts data for template
    const formattedPosts = formatPostsForEmail(posts);
    
    // Generate a unique ID for this digest (using date in format YYYYMMDD)
    const today = new Date();
    const digestDate = today.toISOString().slice(0, 10).replace(/-/g, '');
    const digestId = `daily#${digestDate}`;

    const dateFormatted = endDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Calculate and format the start date for multi-day digests
    let startDateFormatted = null;
    if (daysBack > 1) {
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - (daysBack - 1));
      startDateFormatted = startDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric'
      });
    }
    
    // 4. Determine the subject line
    let subjectLine;
    
    if (customSubject) {
      // Use provided custom subject
      subjectLine = customSubject;
    } else if (askForSubject) {
      // Ask user to select or create a subject
      subjectLine = await promptForSubject(formattedPosts);
    } else {
      // Default: use preview_text from the latest post
      subjectLine = posts[0].preview_text || posts[0].content.substring(0, 40);
    }
    
    // Check if this digest was already sent today
    if (!dryRun && !testEmail) {
      const existingDelivery = await pool.query(
        'SELECT id FROM email_deliveries WHERE delivery_id = $1',
        [digestId]
      );
      
      if (existingDelivery.rows.length > 0) {
        console.log(`Digest for ${digestDate} has already been sent`);
        return { 
          success: false, 
          status: 'skipped', 
          reason: 'already_sent_today',
          digestId
        };
      }
    }
    
    // 5. Create delivery record
    let deliveryDbId = null;

    if (!dryRun && !testEmail) {
      const deliveryResult = await pool.query(
        'INSERT INTO email_deliveries (delivery_id, sent_at, recipient_count, subject) VALUES ($1, NOW(), $2, $3) RETURNING id',
        [digestId, subscribers.length, subjectLine]
      );
      deliveryDbId = deliveryResult.rows[0].id;
    }
    
    // 6. Generate template once
    const baseHtml = render('email-digest', {
      posts: formattedPosts,
      startDateFormatted,
      daysBack,
      dateFormatted
    });
    
    // If dry run, just return the preview
    if (dryRun) {
      return {
        success: true,
        status: 'dry_run',
        subscriberCount: subscribers.length,
        posts: formattedPosts,
        digestId,
        subject: subjectLine,
        htmlPreview: baseHtml.replace('%%unsubscribeUrl%%', 'test-token')
      };
    }
    
    // 7. Send emails in batches
    const BATCH_SIZE = 50;
    let successCount = 0;
    let errorCount = 0;
    
    // Group subscribers into batches
    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batchSubscribers = subscribers.slice(i, i + BATCH_SIZE);
      
      // Create batch emails
      const emailBatch = batchSubscribers.map(subscriber => {
        // Generate personalized unsubscribe URL
        const unsubscribeUrl = `https://maxua.com/api/unsubscribe?token=${subscriber.unsubscribe_token}`;
        
        // Replace placeholder with actual token
        const html = baseHtml.replace('%%unsubscribeUrl%%', unsubscribeUrl);
        
        // Plain text version (simplified)
        const text = `${subjectLine}\n\n` +
          `This digest includes ${posts.length} recent posts.\n` +
          `Visit https://maxua.com to read all posts.\n\n` +
          `To unsubscribe: ${unsubscribeUrl}`;
        
        return {
          from: 'Max Ischenko <hello@maxua.com>',
          to: [subscriber.email],
          reply_to: 'ischenko@gmail.com',
          subject: subjectLine,
          html: html,
          text: text,
          metadata: {
            digest_id: digestId,
            subscriber_id: subscriber.id
          }
        };
      });
      
      try {
        // Send this batch
        const { data, error } = await resend.batch.send(emailBatch);
        
        if (error) {
          console.error(`Error sending batch ${Math.floor(i/BATCH_SIZE) + 1}:`, error);
          errorCount += batchSubscribers.length;
          continue;
        }
        
        // Count successful sends in this batch
        const batchSuccessCount = data.data && Array.isArray(data.data)
          ? data.data.filter(item => item.id).length
          : 0;
        successCount += batchSuccessCount;
        
        console.log(`Batch ${Math.floor(i/BATCH_SIZE) + 1}: Sent ${batchSuccessCount}/${batchSubscribers.length} emails`);
        
        // Update last_sent_at for subscribers in this batch
        if (batchSuccessCount > 0 && !testEmail) {
          const subscriberIds = batchSubscribers.map(s => s.id);
          await pool.query(
            'UPDATE subscribers SET last_sent_at = NOW() WHERE id = ANY($1)',
            [subscriberIds]
          );
        }
      } catch (batchError) {
        console.error(`Error processing batch ${Math.floor(i/BATCH_SIZE) + 1}:`, batchError);
        errorCount += batchSubscribers.length;
      }
    }
    
    // 8. Update delivery record with actual count
    if (deliveryDbId) {
      await pool.query(
        'UPDATE email_deliveries SET recipient_count = $1 WHERE id = $2',
        [successCount, deliveryDbId]
      );
    }
    
    return {
      success: successCount > 0,
      deliveryId: digestId,
      deliveryDbId,
      sentCount: successCount,
      errorCount: errorCount,
      subject: subjectLine
    };
    
  } catch (error) {
    console.error('Error sending daily digest:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get posts from the past X days
 * @param {number} days - Number of days to look back
 * @returns {Promise<Array>} - Array of post objects
 */
async function getRecentPosts(startDate, endDate) {
  const query = `
    SELECT * FROM posts p
    WHERE status = 'public' AND
    created_at >= $1 and created_at <= $2
    ORDER BY created_at DESC
  `;
  
  const result = await pool.query(query, [startDate, endDate]);
  return result.rows;
}

/**
 * Format posts for display in the email
 * @param {Array} posts - Array of post objects from database
 * @returns {Array} - Formatted post objects ready for the template
 */
function formatPostsForEmail(posts) {
  return posts.map(post => {
    // Format the post data for the template, similar to timelinePage.js
    const escapedContent = escapeHTML(post.content);
    
    return {
      ...post,
      formatted_date: formatDate(post.created_at),
      content_html: linkifyContent(escapedContent).replace(/\n/g, '<br>')
    };
  });
}

/**
 * Linkify content but ensure it works well in emails
 * @param {string} text - Text content to linkify
 * @returns {string} - HTML with links properly formatted for email
 */
function linkifyContent(text) {
  if (!text) return '';
  
  // Convert URLs to actual clickable links (for email)
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, url => 
    `<a href="${url}" target="_blank" style="color: #1a73e8; text-decoration: underline; display: inline-block;">${url}</a>`
  );
}

/**
 * Prompt for subject line interactively
 * @param {Array} posts - Array of formatted post objects
 * @returns {Promise<string>} - Selected or custom subject line
 */
async function promptForSubject(posts) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log('\nSelect a subject line for the digest:');
    
    // Display options based on post preview texts
    posts.forEach((post, index) => {
      console.log(`${index + 1}: ${post.preview_text || post.content.substring(0, 40)}`);
    });
    
    console.log(`${posts.length + 1}: Enter custom subject`);
    
    rl.question('\nEnter your choice (number): ', (answer) => {
      const choice = parseInt(answer.trim());
      
      if (choice > 0 && choice <= posts.length) {
        // User selected a post's preview text
        const subject = posts[choice - 1].preview_text || posts[choice - 1].content.substring(0, 40);
        rl.close();
        resolve(subject);
      } else if (choice === posts.length + 1) {
        // User wants to enter a custom subject
        rl.question('Enter custom subject: ', (customSubject) => {
          rl.close();
          resolve(customSubject.trim());
        });
      } else {
        // Invalid choice, default to the first post
        console.log('Invalid choice, using first post as subject.');
        const subject = posts[0].preview_text || posts[0].content.substring(0, 40);
        rl.close();
        resolve(subject);
      }
    });
  });
}

module.exports = {
  sendDailyDigest
};

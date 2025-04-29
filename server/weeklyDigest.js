// server/weeklyDigest.js - updated with delivery_id approach
const { Resend } = require('resend');
const { pool, formatDate, escapeHTML } = require('./utils');
const { render } = require('./templateEngine');

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send a weekly digest email to all subscribers
 * Can be called via a cron job or manually for testing
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.testEmail - If set, only send to this email for testing
 * @param {number} options.daysBack - How many days of posts to include (default: 7)
 * @param {boolean} options.dryRun - If true, don't actually send emails
 * @returns {Promise<Object>} - Result of the operation
 */
async function sendWeeklyDigest(options = {}) {
  const {
    testEmail = null,
    daysBack = 7,
    dryRun = false
  } = options;

  try {
    // 1. Get posts from the last X days
    const posts = await getRecentPosts(daysBack);
    
    if (posts.length === 0) {
      console.log(`No posts in the last ${daysBack} days, skipping digest`);
      return {
        success: true,
        status: 'skipped',
        reason: 'no_posts'
      };
    }
    
    console.log(`Found ${posts.length} posts for the weekly digest`);
    
    // 2. Get confirmed subscribers (or just test email if in test mode)
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
      // Get actual subscribers
      const subscribersResult = await pool.query(
        'SELECT id, email, name, unsubscribe_token FROM subscribers WHERE confirmed = true'
      );
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
    const digestId = `digest#${digestDate}`;
    
    const subj = `maxua.com weekly digest (${today.toLocaleDateString()})`;
    
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
    
    // 4. Create delivery record
    let deliveryDbId = null;

    if (!dryRun && !testEmail) {
      const deliveryResult = await pool.query(
        'INSERT INTO email_deliveries (delivery_id, sent_at, recipient_count, subject) VALUES ($1, NOW(), $2, $3) RETURNING id',
        [digestId, subscribers.length, subj]
      );
      deliveryDbId = deliveryResult.rows[0].id;
    }
    
    // 5. Generate template once
    const baseHtml = render('email-digest', { posts: formattedPosts });
    
    // If dry run, just return the preview
    if (dryRun) {
      return {
        success: true,
        status: 'dry_run',
        subscriberCount: subscribers.length,
        posts: formattedPosts,
        digestId,
        htmlPreview: baseHtml.replace('%%unsubscribeUrl%%', 'test-token')
      };
    }
    
    // 6. Send emails in batches
    const BATCH_SIZE = 50;
    let successCount = 0;
    let errorCount = 0;
    
    // Group subscribers into batches
    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batchSubscribers = subscribers.slice(i, i + BATCH_SIZE);
      
      // Create batch emails
      const emailBatch = batchSubscribers.map(subscriber => {
        // Generate personalized unsubscribe URL
        const unsubscribeUrl = `${subscriber.unsubscribe_token}`;
        
        // Replace placeholder with actual token
        const html = baseHtml.replace('%%unsubscribeUrl%%', unsubscribeUrl);
        
        // Plain text version (simplified)
        const text = `${subj}\n\n` +
          `This digest includes ${posts.length} recent posts from the past week.\n` +
          `Visit https://maxua.com to read all posts.\n\n` +
          `To unsubscribe: https://maxua.com/api/unsubscribe?token=${unsubscribeUrl}`;
        
        return {
          from: 'Max Ischenko <hello@maxua.com>',
          to: [subscriber.email],
          reply_to: 'ischenko@gmail.com',
          subject: subj,
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
    
    // 7. Update delivery record with actual count
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
      errorCount: errorCount
    };
    
  } catch (error) {
    console.error('Error sending weekly digest:', error);
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
async function getRecentPosts(days = 7) {
  const query = `
    SELECT 
      p.*, 
      t.name as topic_name, 
      t.slug as topic_slug,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.confirmed = true) as comment_count
    FROM posts p
    LEFT JOIN topics t ON p.topic_id = t.id
    WHERE p.created_at >= NOW() - INTERVAL '${days} days'
    ORDER BY p.created_at DESC
  `;
  
  const result = await pool.query(query);
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
      content_html: linkifyContent(escapedContent)
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

module.exports = {
  sendWeeklyDigest
};

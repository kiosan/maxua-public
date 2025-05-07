// server/emailDelivery.js 
const { Resend } = require('resend');
const { pool, formatDate, getPostPermalink } = require('./utils');
const { render } = require('./templateEngine');

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Share a blog post to email subscribers using batch sending
 * 
 * @param {Object} post - The post object to share
 * @returns {Promise<Object>} - The result of the email send operation
 */
async function sharePostToEmail(post) {
  if (!post || !post.id || !post.content) {
    throw new Error('Invalid post data');
  }

  // Generate the delivery ID for this post
  const deliveryId = `post#${post.id}`;

  // Check if this post has already been sent
  const existingDelivery = await pool.query(
    'SELECT id FROM email_deliveries WHERE delivery_id = $1',
    [deliveryId]
  );

  if (existingDelivery.rows.length > 0) {
    console.log(`Post ${post.id} has already been sent via email`);
    return { skipped: true, reason: 'already_sent' };
  }

  // Get confirmed subscribers
  const subscribersResult = await pool.query(`
    SELECT id, email, name, unsubscribe_token 
    FROM subscribers 
    WHERE confirmed = true AND preferences = 'single-post'
  `);
  
  const subscribers = subscribersResult.rows;
  
  if (subscribers.length === 0) {
    console.log('No confirmed subscribers to send to');
    return { success: false, reason: 'no_subscribers' };
  }

  console.log(`Preparing to send batch email to ${subscribers.length} subscribers`);

  // Format subject line
  let subject = post.preview_text || post.content;
  
  // Truncate to reasonable length for email subject
  if (subject.length > 40) {
    // Try to cut at a space, not mid-word
    const truncateAt = subject.lastIndexOf(' ', 37);
    subject = subject.substring(0, truncateAt > 0 ? truncateAt : 37) + '..';
  }
  
  // Remove any newlines from subject
  subject = subject.replace(/\n/g, ' ').trim();

  // Create a delivery record
  const deliveryResult = await pool.query(
    'INSERT INTO email_deliveries (delivery_id, recipient_count, subject) VALUES ($1, $2, $3) RETURNING id',
    [deliveryId, subscribers.length, subject]
  );
  
  const deliveryDbId = deliveryResult.rows[0].id;

  try {
    // Prepare common data for all emails
    const postUrl = `https://maxua.com${getPostPermalink(post)}`;
    const topicName = post.topic_name || null;
    
    // Render the base template just once (will replace unsubscribe URL for each recipient)
    const baseHtml = render('email-post', { 
      post: {
        ...post,
        content: post.content.replace(/\n/g, '<br>'),
        formatted_date: formatDate(post.created_at)
      },
      topicName,
      postUrl
    });

    // Process in batches of up to 50 recipients
    const BATCH_SIZE = 50;
    let successCount = 0;
    let errorCount = 0;
    
    // Group subscribers into batches
    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batchSubscribers = subscribers.slice(i, i + BATCH_SIZE);
      
      // Create a batch of emails
      const emailBatch = batchSubscribers.map(subscriber => {
        // Generate personalized unsubscribe URL
        const unsubscribeUrl = `https://maxua.com/api/unsubscribe?token=${subscriber.unsubscribe_token}`;
        
        // Replace the placeholder in the template with the actual unsubscribe URL
        const html = baseHtml.replace('%%unsubscribeUrl%%', unsubscribeUrl);
        
        // Plain text version
        const text = `New post from Max Ischenko:

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
            delivery_id: deliveryId,
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
        if (batchSuccessCount > 0) {
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

    // Update delivery record with actual count
    await pool.query(
      'UPDATE email_deliveries SET recipient_count = $1 WHERE id = $2',
      [successCount, deliveryDbId]
    );
    
    return {
      success: successCount > 0,
      deliveryId: deliveryDbId,
      sentCount: successCount,
      errorCount: errorCount
    };
    
  } catch (error) {
    console.error('Error in batch email delivery:', error);
    
    // Update delivery record to reflect failure
    await pool.query(
      'UPDATE email_deliveries SET recipient_count = 0 WHERE id = $1',
      [deliveryDbId]
    );
    
    return {
      success: false,
      error: error.message,
      deliveryId: deliveryDbId
    };
  }
}

module.exports = {
  sharePostToEmail
};

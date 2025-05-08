// routes/posts.js
const express = require('express');
const router = express.Router();
const { pool, authMiddleware, rateLimiterMiddleware, generateSlug } = require('../utils');
const { sharePostToTelegram } = require('../telegram');
const { sharePostToBluesky } = require('../bluesky');
const { sharePostToEmail } = require('../emailDelivery');

// Create a new post (requires authentication)
router.post('/publish', authMiddleware, async (req, res) => {
  try {
    if (!req.body.content || typeof req.body.content !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid content' });
    }

    // Generate preview text from content
    const content = req.body.content;
    let previewText = content;
    
    if (content.length > 40) {
      // Try to cut at a space, not mid-word
      const truncateAt = content.lastIndexOf(' ', 37);
      previewText = content.substring(0, truncateAt > 0 ? truncateAt : 37) + '..';
    }
    
    // Remove any newlines from preview text
    previewText = previewText.replace(/\n/g, ' ').trim();

    // Generate a slug for the post
    const textToSlugify = previewText || content.substring(0, Math.min(50, content.length));
    const slug = await generateSlug(textToSlugify);

    // Check if a topic was specified
    const topicId = req.body.topic_id || null;
    
    // Insert post with topic_id if provided
    const result = await pool.query(
      'INSERT INTO posts (content, preview_text, topic_id, slug) VALUES ($1, $2, $3, $4) RETURNING *', 
      [content, previewText, topicId, slug]
    );

    const newPost = result.rows[0];
    
    // If the post was created with a topic, fetch the topic info
    let completePost = { ...newPost };
    
    if (topicId) {
      const topicResult = await pool.query('SELECT name, slug FROM topics WHERE id = $1', [topicId]);
      if (topicResult.rows.length > 0) {
        completePost.topic_name = topicResult.rows[0].name;
        completePost.topic_slug = topicResult.rows[0].slug;
      }
    }

    // Get sharing options with defaults (Telegram ON, Bluesky OFF, Email ON)
    const shareOptions = req.body.share_options || {};
    const shareTelegram = shareOptions.telegram !== undefined ? shareOptions.telegram : true;
    const shareEmail = shareOptions.email !== undefined ? shareOptions.email : true;
    const shareBluesky = shareOptions.bluesky !== undefined ? shareOptions.bluesky : false;

    // Share the post via email if enabled and Resend API key is available
    if (shareEmail) {
      try {
        if (process.env.RESEND_API_KEY) {
          const emailResult = await sharePostToEmail(completePost);
          if (emailResult.success) {
            console.log(`Post ${newPost.id} sent via email to ${emailResult.sentCount} subscribers`);
          } else if (emailResult.skipped) {
            console.log(`Post ${newPost.id} email delivery skipped: ${emailResult.reason}`);
          } else {
            console.log(`Post ${newPost.id} email delivery failed: ${emailResult.reason}`);
          }
        } else {
          console.log('Resend API key not set, skipping email delivery');
        }
      } catch (error) {
        console.error('Error sharing via email:', error);
        // We don't want to fail the post creation if email delivery fails
      }
    } else {
      console.log(`Email delivery disabled for post ${newPost.id}`);
    }

    // Share to Telegram if enabled and token is available
    if (shareTelegram) {
      try {
        if (process.env.TELEGRAM_BOT_TOKEN) {
          await sharePostToTelegram(completePost);
          console.log(`Post ${newPost.id} shared to Telegram`);
        } else {
          console.log('Telegram bot token not set, skipping share');
        }
      } catch (error) {
        console.error('Error sharing to Telegram:', error);
        // We don't want to fail the post creation if Telegram fails
      }
    } else {
      console.log(`Telegram sharing disabled for post ${newPost.id}`);
    }
    
    // Share the post to Bluesky if enabled and credentials are available
    if (shareBluesky) {
      try {
        if (process.env.BLUESKY_USERNAME && process.env.BLUESKY_PASSWORD) {
          await sharePostToBluesky(completePost);
          console.log(`Post ${newPost.id} shared to Bluesky`);
        } else {
          console.log('Bluesky credentials not set, skipping share');
        }
      } catch (error) {
        console.error('Error sharing to Bluesky:', error);
        // We don't want to fail the post creation if Bluesky sharing fails
      }
    } else {
      console.log(`Bluesky sharing disabled for post ${newPost.id}`);
    }
    
    return res.status(201).json(newPost);
  } catch (error) {
    console.error('Error creating post:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Track post and page views
router.post('/views', rateLimiterMiddleware, async (req, res) => {
  try {
    let { postId, pathname, anonId } = req.body;

    if (!anonId || (!postId && !pathname)) {
      return res.status(400).json({ error: 'Missing postId or pathname or anonId' });
    }

    // Extract postId from pathname if needed
    if (!postId && pathname?.startsWith('/p/')) {
      const match = pathname.match(/^\/p\/(\d+)/);
      if (match) {
        postId = parseInt(match[1], 10);
      }
    }

    // Track post view if postId is available
    if (postId) {
      await pool.query(
        `INSERT INTO page_views (post_id, anon_id)
         VALUES ($1, $2)
         ON CONFLICT (post_id, anon_id) DO NOTHING`,
        [postId, anonId]
      );
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Error logging view:', err.message);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Get topics
router.get('/topics', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, slug, description, created_at
      FROM topics
      ORDER BY name ASC
    `);
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching topics:', error);
    return res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

module.exports = router;

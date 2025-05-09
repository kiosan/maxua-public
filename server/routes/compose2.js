// server/routes/compose2.js - Updated unified post route
const express = require('express');
const router = express.Router();
const { pool, authMiddleware, generateSlug } = require('../utils');
const sanitizeHtml = require('sanitize-html');
const templateEngine = require('../templateEngine');
const { sharePostToTelegram } = require('../telegram');
const { sharePostToBluesky } = require('../bluesky');

// Display the compose page
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Fetch topics for the dropdown
    const topicsResult = await pool.query('SELECT id, name, slug FROM topics ORDER BY name ASC');
    const topics = topicsResult.rows;
    
    // Render the compose2 template
    const html = templateEngine.render('compose2', {
      pageTitle: 'Compose - Max Ischenko',
      topics: topics
    });
    
    res.send(html);
  } catch (error) {
    console.error('Error rendering compose2 page:', error);
    res.status(500).send(`<h1>500 - Server Error</h1><p>${error.message}</p>`);
  }
});

// Handle both drafts and published posts
router.post('/post', authMiddleware, async (req, res) => {
  try {
    const { content, attachments, status, shareTelegram, shareBluesky, topicId } = req.body;
    
    // Validate input
    if ((!content || content.trim() === '') && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'Post must have either content or attachments' });
    }
    
    // Validate status
    const validStatus = status === 'draft' || status === 'published';
    if (!validStatus) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    // Start a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // STEP 1: Generate preview text from content
      let previewText = '';
      if (content) {
        if (content.length > 40) {
          // Try to cut at a space, not mid-word
          const truncateAt = content.lastIndexOf(' ', 37);
          previewText = content.substring(0, truncateAt > 0 ? truncateAt : 37) + '..';
        } else {
          previewText = content;
        }
        // Remove any newlines from preview text
        previewText = previewText.replace(/\n/g, ' ').trim();
      } else if (attachments && attachments.length > 0) {
        // If no content but has attachments, create preview from first attachment
        const firstAttachment = attachments[0];
        if (firstAttachment.type === 'html') {
          // Extract text from HTML for preview
          const textContent = firstAttachment.content.replace(/<[^>]*>/g, ' ');
          if (textContent.length > 40) {
            const truncateAt = textContent.lastIndexOf(' ', 37);
            previewText = textContent.substring(0, truncateAt > 0 ? truncateAt : 37) + '..';
          } else {
            previewText = textContent;
          }
          previewText = previewText.replace(/\n/g, ' ').trim();
        }
      }

      // STEP 2: Generate a slug for the post
      const textToSlugify = previewText || content.substring(0, Math.min(50, content.length));
      const slug = await generateSlug(textToSlugify);

      // STEP 3: Insert post with all required fields
      const postResult = await client.query(
        `INSERT INTO posts 
         (content, preview_text, slug, topic_id, status) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`, 
        [
          content || '', 
          previewText, 
          slug,
          topicId || null, 
          status
        ]
      );

      const post = postResult.rows[0];
      
      // STEP 4: Process and save attachments if any
      if (attachments && attachments.length > 0) {
        for (let i = 0; i < attachments.length; i++) {
          const attachment = attachments[i];
          
          // Sanitize HTML content
          let sanitizedContent = attachment.content;
          if (attachment.type === 'html') {
            sanitizedContent = sanitizeHtml(attachment.content, {
              allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img']),
              allowedAttributes: {
                ...sanitizeHtml.defaults.allowedAttributes,
                'img': ['src', 'alt', 'title']
              }
            });
          }
          
          // Insert attachment
          await client.query(
            'INSERT INTO attachments (post_id, type, content, position) VALUES ($1, $2, $3, $4)',
            [post.id, attachment.type, sanitizedContent, i]
          );
        }
      }
      
      // STEP 5: If published, handle sharing to various platforms
      if (status === 'published') {
        // Get complete post with topic info for sharing
        const completePostResult = await client.query(`
          SELECT p.*, t.name as topic_name, t.slug as topic_slug 
          FROM posts p
          LEFT JOIN topics t ON p.topic_id = t.id
          WHERE p.id = $1
        `, [post.id]);
        
        const completePost = completePostResult.rows[0];
        
        // Share to Telegram if enabled and token is available
        if (shareTelegram) {
          try {
            if (process.env.TELEGRAM_BOT_TOKEN) {
              await sharePostToTelegram(completePost);
              console.log(`Post ${post.id} shared to Telegram`);
            } else {
              console.log('Telegram bot token not set, skipping share');
            }
          } catch (telegramError) {
            console.error('Error sharing to Telegram:', telegramError);
            // Continue even if Telegram sharing fails
          }
        }
        
        // Share to Bluesky if enabled and credentials are available
        if (shareBluesky) {
          try {
            if (process.env.BLUESKY_USERNAME && process.env.BLUESKY_PASSWORD) {
              await sharePostToBluesky(completePost);
              console.log(`Post ${post.id} shared to Bluesky`);
            } else {
              console.log('Bluesky credentials not set, skipping share');
            }
          } catch (blueskyError) {
            console.error('Error sharing to Bluesky:', blueskyError);
            // Continue even if Bluesky sharing fails
          }
        }
      }
      
      await client.query('COMMIT');
      
      return res.status(201).json(post);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating post:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

module.exports = router;

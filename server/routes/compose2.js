// server/routes/compose2.js
const express = require('express');
const router = express.Router();
const { pool, authMiddleware } = require('../utils');
const templateEngine = require('../templateEngine');
const sanitizeHtml = require('sanitize-html');


router.get('/', authMiddleware, async (req, res) => {
  try {
    // Render the compose2 template
    const html = templateEngine.render('compose2', {
      pageTitle: 'Compose with Attachments - Max Ischenko'
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
    const { content, attachments, status } = req.body;
    
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
      
      // Generate preview text from content
      let previewText = '';
      if (content) {
        previewText = content.length > 40 
          ? content.substring(0, Math.min(37, content.indexOf(' ', 30) !== -1 ? content.indexOf(' ', 30) : 37)) + '..' 
          : content;
        // Remove any newlines from preview text
        previewText = previewText.replace(/\n/g, ' ').trim();
      } else if (attachments && attachments.length > 0) {
        // If no content but has attachments, create preview from first attachment
        const firstAttachment = attachments[0];
        if (firstAttachment.type === 'html') {
          // Extract text from HTML for preview
          const textContent = firstAttachment.content.replace(/<[^>]*>/g, ' ');
          previewText = textContent.length > 40 
            ? textContent.substring(0, Math.min(37, textContent.indexOf(' ', 30) !== -1 ? textContent.indexOf(' ', 30) : 37)) + '..' 
            : textContent;
          previewText = previewText.replace(/\n/g, ' ').trim();
        }
      }

      // Insert post with the specified status
      const postResult = await client.query(
        'INSERT INTO posts (content, preview_text, status) VALUES ($1, $2, $3) RETURNING *', 
        [content || '', previewText, status]
      );

      const post = postResult.rows[0];
      
      // Process and save attachments if any
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

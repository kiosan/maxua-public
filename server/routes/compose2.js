// server/routes/compose2.js - Updated unified post route
const express = require('express');
const router = express.Router();
const { pool, authMiddleware, generateSlug } = require('../utils');
const templateEngine = require('../templateEngine');
const { sharePostToTelegram } = require('../telegram');
const { sharePostToBluesky } = require('../bluesky');

// Display the compose page
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Render the compose2 template
    const html = templateEngine.render('compose2', {
      pageTitle: 'Compose - Max Ischenko'
    });
    
    res.send(html);
  } catch (error) {
    console.error('Error rendering compose2 page:', error);
    res.status(500).send(`<h1>500 - Server Error</h1><p>${error.message}</p>`);
  }
});

router.get('/drafts', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, content, created_at 
       FROM posts 
       WHERE status = 'draft' 
       ORDER BY created_at DESC 
       LIMIT 10`
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching drafts:', error);
    res.status(500).json({ error: 'Failed to fetch drafts' });
  }
});

router.delete('/drafts/:id', authMiddleware, async (req, res) => {
  try {
    const draftId = req.params.id;
    
    // Delete the draft (only if it's actually a draft)
    const result = await pool.query(
      `DELETE FROM posts 
       WHERE id = $1 AND status = 'draft' 
       RETURNING id`,
      [draftId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Draft not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting draft:', error);
    res.status(500).json({ error: 'Failed to delete draft' });
  }
});

router.post('/post', authMiddleware, async (req, res) => {
  try {
    const { content, status, shareTelegram, shareBluesky, draftId } = req.body;
    
    // Validate inputs
    if (!content?.trim()) {
      return res.status(400).json({ error: 'No content found' });
    }

    if (!['draft', 'published'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const newStatus = status === 'published' ? 'public' : status;

    // Prepare post metadata
    let previewText = content.length > 40 
      ? content.substring(0, content.lastIndexOf(' ', 37) || 37) + '..'
      : content;
    previewText = previewText.replace(/\n/g, ' ').trim();

    const textToSlugify = previewText || content.substring(0, 50);
    const slug = await generateSlug(textToSlugify);

    // Start a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      let post;
      
      if (draftId && status === 'published') {
        const result = await client.query(
          `UPDATE posts 
           SET content = $1, preview_text = $2, slug = $3, status = $4, created_at = NOW()
           WHERE id = $5 AND status = 'draft'
           RETURNING *`,
          [content, previewText, slug, newStatus, draftId]
        );
        
        if (result.rows.length === 0) {
          throw new Error('Draft not found or already published');
        }
        
        post = result.rows[0];

      } else {
        
        const result = await client.query(
          `INSERT INTO posts 
           (content, preview_text, slug, status) 
           VALUES ($1, $2, $3, $4) 
           RETURNING *`, 
          [content, previewText, slug, newStatus]
        );

        if (result.rows.length === 0) {
          throw new Error('Insert failed');
        }
        
        post = result.rows[0];
      }
      
      // If published, handle sharing to various platforms
      if (status === 'published') {
        // Share to Telegram if enabled
        if (shareTelegram) {
          try {
            await sharePostToTelegram(post);
            console.log(`Post ${post.id} shared to Telegram`);
          } catch (telegramError) {
            console.error('Error sharing to Telegram:', telegramError);
          }
        }
        
        // Share to Bluesky if enabled
        if (shareBluesky) {
          try {
            await sharePostToBluesky(post);
            console.log(`Post ${post.id} shared to Bluesky`);
          } catch (blueskyError) {
            console.error('Error sharing to Bluesky:', blueskyError);
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

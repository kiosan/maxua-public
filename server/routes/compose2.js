// server/routes/compose2.js - Updated unified post route
const express = require('express');
const router = express.Router();
const { pool, authMiddleware, generateSlug } = require('../utils');
const templateEngine = require('../templateEngine');
const { sharePostToTelegram } = require('../telegram');
const { sharePostToBluesky, fetchUrlMetadata } = require('../bluesky');

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

router.post('/fetch-link-meta', authMiddleware, async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL required' });
        }
        
        // Import the function from bluesky.js or utils.js
        const metadata = await fetchUrlMetadata(url);
        
        res.json(metadata);
    } catch (error) {
        console.error('Error fetching URL metadata:', error);
        res.status(500).json({ error: 'Failed to fetch metadata' });
    }
});

router.get('/drafts', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, content, type, metadata, created_at 
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
    const { content, type, metadata, status, shareTelegram, shareBluesky, draftId } = req.body;

    // Allow empty content for link posts only
    if (type !== 'link' && !content?.trim()) {
      return res.status(400).json({ error: 'No content found' });
    }

    // Additional validation for link posts
    if (type === 'link' && !metadata?.url) {
      return res.status(400).json({ error: 'Link posts must have a URL' });
    }

    if (!['text', 'quote', 'link'].includes(type)) {
      return res.status(400).json({ error: 'Invalid post type' });
    }

    if (!['draft', 'published'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const newStatus = status === 'published' ? 'public' : status;

    // Prepare post metadata - handle empty content for link posts
    let previewText;

    if (type === 'link' && !content?.trim()) {
      // Use link title for preview if content is empty
      previewText = metadata?.title || metadata?.url || 'Link post';
    } else {
      previewText = content.length > 40 
        ? content.substring(0, content.lastIndexOf(' ', 37) || 37) + '..'
        : content;
      previewText = previewText.replace(/\n/g, ' ').trim();
    }

    const slug = await generateSlug(previewText);

    // Start a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      let post;
      
      if (draftId && status === 'published') {
        const result = await client.query(
          `UPDATE posts 
           SET content = $1, preview_text = $2, slug = $3, status = $4, 
               type = $5, metadata = $6, created_at = NOW()
           WHERE id = $7 AND status = 'draft'
           RETURNING *`,
          [content, previewText, slug, newStatus, type, metadata, draftId]
        );
        
        if (result.rows.length === 0) {
          throw new Error('Draft not found or already published');
        }
        
        post = result.rows[0];

      } else {
        
        const result = await client.query(
          `INSERT INTO posts 
           (content, preview_text, slug, status, type, metadata) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           RETURNING *`, 
          [content, previewText, slug, newStatus, type, metadata]
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

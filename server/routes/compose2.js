// Updated server/routes/compose2.js to support post editing
const express = require('express');
const router = express.Router();
const { db, runQuery, authMiddleware, generateSlug } = require('../utils');
const templateEngine = require('../templateEngine');
const { sharePostToTelegram } = require('../telegram');
const { sharePostToBluesky, fetchUrlMetadata } = require('../bluesky');

// Display the compose page - updated to support editing mode
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Check if editing an existing post
    const editPostId = req.query.edit;
    
    // If editing, fetch the post data
    let postData = null;
    
    if (editPostId) {
      console.log(`[DEBUG] Loading post for editing, id: ${editPostId}`);
      const result = await runQuery(
        `SELECT id, content, type, status, metadata, created_at, slug, preview_text 
         FROM posts 
         WHERE id = ?`,  // Allow editing any post regardless of status
        [editPostId]
      );
      
      console.log(`[DEBUG] Query result:`, result);
      
      if (result.rows.length > 0) {
        postData = result.rows[0];
        console.log(`[DEBUG] Post data loaded:`, postData);
      } else {
        console.log(`[DEBUG] Post not found with id: ${editPostId}`);
        return res.status(404).send('Post not found or cannot be edited');
      }
    }
    
    const html = templateEngine.render('compose2', {
      pageTitle: editPostId ? 'Edit Post - Sasha Bondar' : 'Compose - Sasha Bondar',
      editMode: !!editPostId,
      postData: postData || null
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
    const result = await runQuery(
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
    console.log("delete", draftId);
    
    // Delete the draft (only if it's actually a draft)
    const result = await runQuery(
      `DELETE FROM posts 
       WHERE id = ? AND status = 'draft' 
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
    const { content, status, metadata, shareTelegram, shareBluesky, draftId, editPostId } = req.body;
    
    // Basic validation
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'No content found' });
    }

    if (!['draft', 'published'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const newStatus = status === 'published' ? 'public' : status;

    // Validate metadata
    // - Keys must be alphanumeric with underscores
    // - Skip keys with empty values
    // - Convert value to string if needed 
    let validatedMetadata = {};
    if (metadata && typeof metadata === 'object') {
      Object.entries(metadata).forEach(([key, value]) => {
        if (/^[a-zA-Z0-9_]+$/.test(key) && value !== '' && key !== 'key') {
          validatedMetadata[key] = String(value);
        }
      });
    }

    const metadata_json = JSON.stringify(validatedMetadata);

    // Prepare post preview text
    const previewText = content.length > 40 
      ? content.substring(0, content.lastIndexOf(' ', 37) || 37) + '..'
      : content;
    
    const slug = await generateSlug(previewText);

    // Start a transaction
    // With SQLite we don't need to get a client connection
    
    try {
      // SQLite transactions are handled differently
      db.prepare('BEGIN TRANSACTION').run();
      
      let post;
      
      // EDIT MODE: Updating an existing published post
      if (editPostId && status === 'published') {
        // Verify the post exists and is published
        const checkResult = await runQuery(
          `SELECT id, created_at FROM posts WHERE id = ? AND status = 'public'`,
          [editPostId]
        );
        
        if (checkResult.rows.length === 0) {
          throw new Error('Post not found or is not published');
        }
        
        // Keep the original created_at timestamp when updating
        const originalCreatedAt = checkResult.rows[0].created_at;
        
        // Update the existing post - preserve created_at timestamp
        const result = await runQuery(
          `UPDATE posts 
           SET content = ?, preview_text = ?, slug = ?, 
               type = 'text', metadata = ?, updated_at = datetime('now')
           WHERE id = ? AND status = 'public'
           RETURNING *`,
          [content, previewText, slug, JSON.stringify(validatedMetadata), editPostId]
        );
        
        if (result.rows.length === 0) {
          throw new Error('Failed to update post');
        }
        
        post = result.rows[0];
      } 
      // DRAFT EDIT MODE: Updating an existing draft
      else if (draftId && status === 'draft') {
        // Verify the draft exists
        const checkResult = await runQuery(
          `SELECT id FROM posts WHERE id = ? AND status = 'draft'`,
          [draftId]
        );
        
        if (checkResult.rows.length === 0) {
          throw new Error('Draft not found');
        }
        
        // Update the existing draft
        const result = await runQuery(
          `UPDATE posts 
           SET content = ?, preview_text = ?, slug = ?,
               type = 'text', metadata = ?, updated_at = datetime('now')
           WHERE id = ? AND status = 'draft'
           RETURNING *`,
          [content, previewText, slug, JSON.stringify(validatedMetadata), draftId]
        );
        
        if (result.rows.length === 0) {
          throw new Error('Failed to update draft');
        }
        
        post = result.rows[0];
      }
      // PUBLISH FROM DRAFT: Converting a draft to a published post
      else if (draftId && status === 'published') {
        const result = await runQuery(
          `UPDATE posts 
           SET content = ?, preview_text = ?, slug = ?, status = ?, 
               type = 'text', metadata = ?, created_at = datetime('now')
           WHERE id = ? AND status = 'draft'
           RETURNING *`,
          [content, previewText, slug, newStatus, JSON.stringify(validatedMetadata), draftId]
        );
        
        if (result.rows.length === 0) {
          throw new Error('Draft not found or already published');
        }
        
        post = result.rows[0];
      } 
      // NORMAL MODE: Create a new post or draft
      else {
        const result = await runQuery(
          `INSERT INTO posts 
           (content, preview_text, slug, status, type, metadata) 
           VALUES (?, ?, ?, ?, 'text', ?) 
           RETURNING *`, 
          [content, previewText, slug, newStatus, JSON.stringify(validatedMetadata)]
        );

        if (result.rows.length === 0) {
          throw new Error('Insert failed');
        }
        
        post = result.rows[0];
      }
      
      // If published, handle sharing to various platforms
      // Only share when publishing new posts, not when editing
      if (status === 'published' && !editPostId) {
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
      
      // Commit SQLite transaction
      db.prepare('COMMIT').run();
      
      return res.status(201).json(post);
    } catch (error) {
      // Rollback SQLite transaction
      db.prepare('ROLLBACK').run();
      throw error;
    } finally {
      // No need to release connection with SQLite
    }
  } catch (error) {
    console.error('Error creating/updating post:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

module.exports = router;

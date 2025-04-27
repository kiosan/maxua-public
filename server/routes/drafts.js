// routes/drafts.js
const express = require('express');
const router = express.Router();
const { pool } = require('../utils');
const { authMiddleware } = require('../middleware/auth');

console.log("drafts.js loaded");

// Get all drafts or a specific draft
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.query.id) {
      // Get a specific draft
      const result = await pool.query(
        `SELECT d.*, t.name as topic_name, t.slug as topic_slug
         FROM drafts d
         LEFT JOIN topics t ON d.topic_id = t.id
         WHERE d.id = $1`,
        [req.query.id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Draft not found' });
      }
      
      return res.json(result.rows[0]);
    } else {
      // Get all drafts
      const result = await pool.query(`
        SELECT d.*, t.name as topic_name, t.slug as topic_slug
        FROM drafts d
        LEFT JOIN topics t ON d.topic_id = t.id
        ORDER BY d.updated_at DESC
      `);
      
      return res.json(result.rows);
    }
  } catch (error) {
    console.error('Error fetching drafts:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Create a new draft
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (!req.body.content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    // Insert the draft
    const result = await pool.query(
      `INSERT INTO drafts 
       (content, topic_id, share_telegram, share_bluesky, title) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [
        req.body.content,
        req.body.topic_id || null,
        req.body.share_telegram !== undefined ? req.body.share_telegram : true,
        req.body.share_bluesky !== undefined ? req.body.share_bluesky : false,
        req.body.title || null
      ]
    );
    
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating draft:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Update a draft
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const draftId = req.params.id;
    
    // Check if the draft exists
    const checkResult = await pool.query(
      'SELECT id FROM drafts WHERE id = $1',
      [draftId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Draft not found' });
    }
    
    // Build the update query dynamically based on provided fields
    const updates = [];
    const values = [];
    let paramCounter = 1;
    
    if (req.body.content !== undefined) {
      updates.push(`content = $${paramCounter++}`);
      values.push(req.body.content);
    }
    
    if (req.body.topic_id !== undefined) {
      updates.push(`topic_id = $${paramCounter++}`);
      values.push(req.body.topic_id === null ? null : req.body.topic_id);
    }
    
    if (req.body.share_telegram !== undefined) {
      updates.push(`share_telegram = $${paramCounter++}`);
      values.push(req.body.share_telegram);
    }
    
    if (req.body.share_bluesky !== undefined) {
      updates.push(`share_bluesky = $${paramCounter++}`);
      values.push(req.body.share_bluesky);
    }
    
    if (req.body.title !== undefined) {
      updates.push(`title = $${paramCounter++}`);
      values.push(req.body.title);
    }
    
    // Always update the updated_at timestamp
    updates.push(`updated_at = NOW()`);
    
    // If no updates provided, return error
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    // Add the draft ID to the values array
    values.push(draftId);
    
    // Perform the update
    const result = await pool.query(
      `UPDATE drafts SET ${updates.join(', ')} WHERE id = $${paramCounter} RETURNING *`,
      values
    );
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating draft:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Delete a draft
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const draftId = req.params.id;
    
    // Check if the draft exists
    const checkResult = await pool.query(
      'SELECT id FROM drafts WHERE id = $1',
      [draftId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Draft not found' });
    }
    
    // Delete the draft
    await pool.query('DELETE FROM drafts WHERE id = $1', [draftId]);
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting draft:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Delete all drafts
router.delete('/', authMiddleware, async (req, res) => {
  try {
    if (req.query.all === 'true') {
      // Delete all drafts
      await pool.query('DELETE FROM drafts');
      return res.json({ success: true });
    } else {
      return res.status(400).json({ error: 'Query parameter "all=true" is required' });
    }
  } catch (error) {
    console.error('Error deleting all drafts:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

module.exports = router;

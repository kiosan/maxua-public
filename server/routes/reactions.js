// routes/reactions.js
const express = require('express');
const router = express.Router();
const { pool } = require('../utils');
const { rateLimiterMiddleware } = require('../middleware/rateLimiter');

// Get reactions for a post
router.get('/:postId', rateLimiterMiddleware, async (req, res) => {
  try {
    const postId = req.params.postId;
    
    // Get all reactions for this post
    const reactions = await getPostReactions(postId);
    
    // If user has provided their anonId, get their reactions too
    const anonId = req.query.anonId;
    let userReactions = [];
    
    if (anonId) {
      userReactions = await getUserReactions(postId, anonId);
    }
    
    return res.json({ reactions, userReactions });
  } catch (error) {
    console.error('Error in reactions handler:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Toggle a reaction on a post
router.post('/:postId', rateLimiterMiddleware, async (req, res) => {
  try {
    const postId = req.params.postId;
    const { emoji, anonId } = req.body;
    
    if (!emoji || !anonId) {
      return res.status(400).json({ error: 'Missing emoji or anonId' });
    }
    
    const result = await handleToggleReaction(postId, emoji, anonId);
    const updatedReactions = await getPostReactions(postId);
    
    return res.json({
      success: true,
      ...result,
      reactions: updatedReactions
    });
  } catch (error) {
    console.error('Error in reactions handler:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Helper functions defined in the same file
async function handleToggleReaction(postId, emoji, anonId) {
  const checkResult = await pool.query(
    'SELECT id FROM reactions WHERE post_id = $1 AND emoji = $2 AND anon_id = $3',
    [postId, emoji, anonId]
  );

  if (checkResult.rows.length > 0) {
    await pool.query(
      'DELETE FROM reactions WHERE post_id = $1 AND emoji = $2 AND anon_id = $3',
      [postId, emoji, anonId]
    );
    return { action: 'removed', emoji };
  } else {
    await pool.query(
      'INSERT INTO reactions(post_id, emoji, anon_id) VALUES($1, $2, $3)',
      [postId, emoji, anonId]
    );
    await pool.query(
      'INSERT INTO activity_log(type, post_id, anon_id, data) VALUES ($1, $2, $3, $4)',
      ['reaction', postId, anonId, { emoji }]
    );
    return { action: 'added', emoji };
  }
}

async function getPostReactions(postId) {
  const result = await pool.query(
    'SELECT emoji, COUNT(*) as count FROM reactions WHERE post_id = $1 GROUP BY emoji',
    [postId]
  );
  const reactions = {};
  result.rows.forEach(row => {
    reactions[row.emoji] = parseInt(row.count);
  });
  return reactions;
}

async function getUserReactions(postId, anonId) {
  const result = await pool.query(
    'SELECT emoji FROM reactions WHERE post_id = $1 AND anon_id = $2',
    [postId, anonId]
  );
  return result.rows.map(row => row.emoji);
}

module.exports = router;

// server/routes/reactions.js
const express = require('express');
const router = express.Router();
const { runQuery, rateLimiterMiddleware, getCorsHeaders } = require('../utils');
const REACTIONS = require('../config/reactions');
const { v4: uuidv4 } = require('uuid');
const cookieParser = require('cookie-parser');

// Valid reaction types from config
const VALID_REACTION_TYPES = REACTIONS.map(r => r.type);

// Set up the reaction cookie if not present
router.use((req, res, next) => {
  // Check if user has a reaction ID cookie
  if (!req.cookies.reaction_id) {
    // Create a unique ID for this user's reactions
    const reactionId = uuidv4();
    // Set cookie to expire in 1 year
    res.cookie('reaction_id', reactionId, { 
      maxAge: 365 * 24 * 60 * 60 * 1000, 
      httpOnly: true,
      sameSite: 'lax',
      path: '/'
    });
    req.cookies.reaction_id = reactionId;
  }
  next();
});

// Fetch reactions for a post
router.get('/post/:postId', async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const cookieId = req.cookies.reaction_id;
    
    if (!postId) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }
    
    // Get reaction counts for the post
    const reactionCounts = await runQuery(
      `SELECT reaction_type, COUNT(*) as count 
       FROM post_reactions 
       WHERE post_id = ? 
       GROUP BY reaction_type`,
      [postId]
    );
    
    // Get user's reaction for this post
    const userReaction = await runQuery(
      `SELECT reaction_type 
       FROM post_reactions 
       WHERE post_id = ? AND cookie_id = ?`,
      [postId, cookieId]
    );
    
    // Format the response
    const reactionStats = {};
    VALID_REACTION_TYPES.forEach(type => {
      reactionStats[type] = 0;
    });
    
    // Add actual counts
    reactionCounts.rows.forEach(row => {
      if (VALID_REACTION_TYPES.includes(row.reaction_type)) {
        reactionStats[row.reaction_type] = parseInt(row.count);
      }
    });
    
    const userReactionType = userReaction.rows.length > 0 
      ? userReaction.rows[0].reaction_type 
      : null;
    
    return res.json({
      counts: reactionStats,
      userReaction: userReactionType,
      // Include reaction configs for convenience
      reactions: REACTIONS
    });
  } catch (error) {
    console.error('Error fetching reactions:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Add or update a reaction
router.post('/post/:postId', rateLimiterMiddleware, async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const { reactionType } = req.body;
    const cookieId = req.cookies.reaction_id;
    
    if (!postId) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }
    
    if (!reactionType || !VALID_REACTION_TYPES.includes(reactionType)) {
      return res.status(400).json({ 
        error: 'Invalid reaction type',
        validTypes: VALID_REACTION_TYPES
      });
    }
    
    // Check if the post exists
    const postCheck = await runQuery(
      'SELECT id FROM posts WHERE id = ?',
      [postId]
    );
    
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Check if user already has a reaction for this post
    const existingReaction = await runQuery(
      'SELECT id, reaction_type FROM post_reactions WHERE post_id = ? AND cookie_id = ?',
      [postId, cookieId]
    );
    
    if (existingReaction.rows.length > 0) {
      // User already has a reaction - update it if different
      if (existingReaction.rows[0].reaction_type !== reactionType) {
        await runQuery(
          'UPDATE post_reactions SET reaction_type = ? WHERE id = ?',
          [reactionType, existingReaction.rows[0].id]
        );
        return res.json({ success: true, action: 'updated', reaction: reactionType });
      } else {
        // Same reaction - remove it (toggle behavior)
        await runQuery(
          'DELETE FROM post_reactions WHERE id = ?',
          [existingReaction.rows[0].id]
        );
        return res.json({ success: true, action: 'removed', reaction: null });
      }
    } else {
      // Add new reaction
      await runQuery(
        'INSERT INTO post_reactions (post_id, reaction_type, cookie_id) VALUES (?, ?, ?)',
        [postId, reactionType, cookieId]
      );
      return res.json({ success: true, action: 'added', reaction: reactionType });
    }
  } catch (error) {
    console.error('Error handling reaction:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get reaction stats for the admin dashboard
router.get('/stats', async (req, res) => {
  try {
    // Get top reacted posts
    const topReactedPosts = await runQuery(`
      SELECT p.id, p.title, p.slug, r.reaction_type, COUNT(*) as count
      FROM post_reactions r
      JOIN posts p ON r.post_id = p.id
      GROUP BY p.id, r.reaction_type
      ORDER BY count DESC
      LIMIT 10
    `);
    
    // Get total reaction counts by type
    const reactionTotals = await runQuery(`
      SELECT reaction_type, COUNT(*) as count
      FROM post_reactions
      GROUP BY reaction_type
    `);
    
    return res.json({
      topReacted: topReactedPosts.rows,
      reactionTotals: reactionTotals.rows
    });
  } catch (error) {
    console.error('Error fetching reaction stats:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

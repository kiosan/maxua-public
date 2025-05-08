// routes/admin.js
const express = require('express');
const router = express.Router();
const { pool, authMiddleware } = require('../utils');

// Get admin stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    // Get subscriber count
    const subscriberResult = await pool.query(
      'SELECT COUNT(*) FROM subscribers WHERE confirmed = true'
    );
    const subscriberCount = parseInt(subscriberResult.rows[0].count);

    // Get posts created in the last 7 days
    const postsResult = await pool.query(
      'SELECT COUNT(*) FROM posts WHERE created_at > NOW() - INTERVAL \'7 days\''
    );
    const recentPosts = parseInt(postsResult.rows[0].count);

    // Get comments created in the last 7 days
    const commentsResult = await pool.query(
      'SELECT COUNT(*) FROM comments2 WHERE created_at > NOW() - INTERVAL \'7 days\''
    );
    const recentComments = parseInt(commentsResult.rows[0].count);

    return res.json({
      subscriberCount,
      recentPosts,
      recentComments
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get recent comments
router.get('/comments', authMiddleware, async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    
    // Get the 10 most recent comments, ordered by creation date
    const result = await pool.query(
      `SELECT c.id, c.post_id, c.author, c.email, c.content, c.pinned, c.created_at 
       FROM comments2 c 
       ORDER BY c.created_at DESC 
       LIMIT $1`,
      [limit]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching admin comments:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Toggle comment pin status
router.post('/comments/:id/pin', authMiddleware, async (req, res) => {
  try {
    const commentId = req.params.id;
    const { pinned } = req.body;
    
    if (pinned === undefined) {
      return res.status(400).json({ error: 'Missing pinned state' });
    }

    // Update the comment pinned status
    const result = await pool.query(
      'UPDATE comments2 SET pinned = $1 WHERE id = $2 RETURNING id, pinned',
      [pinned, commentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating comment pin status:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

module.exports = router;

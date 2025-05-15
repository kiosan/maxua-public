// routes/admin.js
const express = require('express');
const router = express.Router();
const { pool, authMiddleware } = require('../utils');

// Get extended stats including visitor metrics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    // Get basic stats (existing subscribers and post stats)
    const subscriberResult = await runQuery(
      'SELECT COUNT(*) FROM subscribers WHERE confirmed = true'
    );
    const subscriberCount = parseInt(subscriberResult.rows[0].count);

    // Get new subscribers in the last 7 days
    const newSubscribersResult = await runQuery(
      "SELECT COUNT(*) FROM subscribers WHERE confirmed = true AND created_at > datetime('now', '-7 days')"
    );
    const newSubscriberCount = parseInt(newSubscribersResult.rows[0].count);

    // Get posts created in the last 7 days
    const postsResult = await runQuery(
      "SELECT COUNT(*) FROM posts WHERE created_at > datetime('now', '-7 days')"
    );
    const recentPosts = parseInt(postsResult.rows[0].count);

    // Get total comments
    const totalCommentsResult = await runQuery(
      'SELECT COUNT(*) FROM comments2'
    );
    const totalComments = parseInt(totalCommentsResult.rows[0].count);

    // Get comments created in the last 7 days
    const commentsResult = await runQuery(
      "SELECT COUNT(*) FROM comments2 WHERE created_at > datetime('now', '-7 days')"
    );
    const recentComments = parseInt(commentsResult.rows[0].count);

    // Get visitor stats
    // Daily active users (last 24 hours)
    const dailyActiveResult = await runQuery(
      "SELECT COUNT(*) FROM visitor_stats WHERE last_seen > datetime('now', '-1 day')"
    );
    const dailyActiveVisitors = parseInt(dailyActiveResult.rows[0].count);

    // Weekly active users (last 7 days)
    const weeklyActiveResult = await runQuery(
      "SELECT COUNT(*) FROM visitor_stats WHERE last_seen > datetime('now', '-7 days')"
    );
    const weeklyActiveVisitors = parseInt(weeklyActiveResult.rows[0].count);

    // All-time unique visitors
    const allTimeResult = await runQuery(
      'SELECT COUNT(*) FROM visitor_stats'
    );
    const allTimeVisitors = parseInt(allTimeResult.rows[0].count);

    return res.json({
      visitors: {
        daily: dailyActiveVisitors,
        weekly: weeklyActiveVisitors,
        allTime: allTimeVisitors
      },
      subscribers: {
        total: subscriberCount,
        newLastWeek: newSubscriberCount
      },
      comments: {
        total: totalComments,
        newLastWeek: recentComments
      },
      posts: {
        newLastWeek: recentPosts
      }
    });
  } catch (error) {
    console.error('Error fetching extended stats:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get recent comments (updated for pagination)
router.get('/comments', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    // Get comments with pagination
    const result = await runQuery(
      `SELECT c.id, c.post_id, c.author, c.email, c.content, c.pinned, c.created_at 
       FROM comments2 c 
       ORDER BY c.created_at DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
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
    const result = await runQuery(
      'UPDATE comments2 SET pinned = ? WHERE id = ? RETURNING id, pinned',
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

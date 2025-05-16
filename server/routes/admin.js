// routes/admin.js
const express = require('express');
const router = express.Router();
const { db, runQuery, authMiddleware } = require('../utils');

// Get extended stats including visitor metrics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    // Get basic stats (existing subscribers and post stats)
    const subscriberResult = await runQuery(
      'SELECT COUNT(*) as count FROM subscribers WHERE confirmed = 1'
    );
    console.log('Subscriber query result:', subscriberResult.rows[0]);
    const subscriberCount = parseInt(subscriberResult.rows[0]?.count || 0);

    // Get new subscribers in the last 7 days
    const newSubscribersResult = await runQuery(
      "SELECT COUNT(*) as count FROM subscribers WHERE confirmed = 1 AND created_at > datetime('now', '-7 days')"
    );
    console.log('New subscriber query result:', newSubscribersResult.rows[0]);
    const newSubscriberCount = parseInt(newSubscribersResult.rows[0]?.count || 0);

    // Get posts created in the last 7 days
    const postsResult = await runQuery(
      "SELECT COUNT(*) as count FROM posts WHERE status = 'public' AND created_at > datetime('now', '-7 days')"
    );
    console.log('Recent posts query result:', postsResult.rows[0]);
    const recentPosts = parseInt(postsResult.rows[0]?.count || 0);

    // Get total comments
    const totalCommentsResult = await runQuery(
      'SELECT COUNT(*) as count FROM comments2'
    );
    console.log('Total comments query result:', totalCommentsResult.rows[0]);
    const totalComments = parseInt(totalCommentsResult.rows[0]?.count || 0);

    // Get comments created in the last 7 days
    const commentsResult = await runQuery(
      "SELECT COUNT(*) as count FROM comments2 WHERE created_at > datetime('now', '-7 days')"
    );
    console.log('Recent comments query result:', commentsResult.rows[0]);
    const recentComments = parseInt(commentsResult.rows[0]?.count || 0);

    // Get visitor stats if the table exists
    let dailyActiveVisitors = 0;
    let weeklyActiveVisitors = 0;
    let allTimeVisitors = 0;
    
    try {
      // Check if visitor_stats table exists
      const tableCheckResult = await runQuery(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='visitor_stats'"
      );
      
      // Only query visitor stats if the table exists
      if (tableCheckResult.rows.length > 0) {
        // Daily active users (last 24 hours)
        const dailyActiveResult = await runQuery(
          "SELECT COUNT(*) FROM visitor_stats WHERE last_seen > datetime('now', '-1 day')"
        );
        dailyActiveVisitors = parseInt(dailyActiveResult.rows[0].count);

        // Weekly active users (last 7 days)
        const weeklyActiveResult = await runQuery(
          "SELECT COUNT(*) FROM visitor_stats WHERE last_seen > datetime('now', '-7 days')"
        );
        weeklyActiveVisitors = parseInt(weeklyActiveResult.rows[0].count);
        
        // All-time unique visitors
        const allTimeResult = await runQuery(
          'SELECT COUNT(*) FROM visitor_stats'
        );
        allTimeVisitors = parseInt(allTimeResult.rows[0].count);
      } else {
        console.log('visitor_stats table does not exist - using default values');
      }
    } catch (error) {
      console.error('Error fetching visitor stats:', error);
      // Continue with default values (0) for visitor stats
    }

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

    // Convert boolean pinned value to integer (0 or 1) for SQLite compatibility
    const pinnedValue = pinned ? 1 : 0;
    
    // Update the comment pinned status
    const result = await runQuery(
      'UPDATE comments2 SET pinned = ? WHERE id = ? RETURNING id, pinned',
      [pinnedValue, commentId]
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

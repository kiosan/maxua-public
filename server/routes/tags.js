/**
 * Routes for hashtag-related functionality
 */

const express = require('express');
const router = express.Router();
const { runQuery, formatMarkdown } = require('../utils');
const { getPopularHashtags } = require('../utils/hashtags');
const templateEngine = require('../templateEngine');

/**
 * Get posts by hashtag
 */
router.get('/tag/:tagName', async (req, res) => {
  try {
    const { tagName } = req.params;
    
    // Validate tag name
    if (!tagName || !/^[a-z0-9_]+$/i.test(tagName)) {
      return res.status(400).send(`<h1>Invalid hashtag</h1><p>Go <a href="/">home</a>?</p>`);
    }
    
    // Get the hashtag details
    const hashtagResult = await runQuery(
      'SELECT id, name, post_count FROM hashtags WHERE name = ?',
      [tagName.toLowerCase()]
    );
    
    if (hashtagResult.rows.length === 0) {
      return res.status(404).send(`<h1>Hashtag not found</h1><p>Go <a href="/">home</a>?</p>`);
    }
    
    const hashtag = hashtagResult.rows[0];
    
    // Get posts with this hashtag
    const postsResult = await runQuery(
      `SELECT p.*, 
        datetime(p.created_at) as formatted_date,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
      FROM posts p
      INNER JOIN post_hashtags ph ON p.id = ph.post_id
      WHERE ph.hashtag_id = ? AND p.status = 'public'
      ORDER BY p.created_at DESC`,
      [hashtag.id]
    );
    
    // Get all hashtags for these posts
    const postIds = postsResult.rows.map(post => post.id);
    
    // Format posts with HTML content
    for (const post of postsResult.rows) {
      post.content_html = formatMarkdown(post.content);
    }
    
    // Get all hashtags for all posts in one query
    let postHashtags = [];
    if (postIds.length > 0) {
      postHashtags = await runQuery(
        `SELECT ph.post_id, h.id, h.name 
         FROM hashtags h
         INNER JOIN post_hashtags ph ON h.id = ph.hashtag_id
         WHERE ph.post_id IN (${postIds.map(() => '?').join(',')})
         ORDER BY h.name ASC`,
        postIds
      );
    }
    
    // Group hashtags by post_id
    const hashtagsByPost = {};
    for (const tag of postHashtags.rows) {
      if (!hashtagsByPost[tag.post_id]) {
        hashtagsByPost[tag.post_id] = [];
      }
      hashtagsByPost[tag.post_id].push({ id: tag.id, name: tag.name });
    }
    
    // Attach hashtags to each post
    for (const post of postsResult.rows) {
      post.hashtags = hashtagsByPost[post.id] || [];
    }
    
    // Get popular hashtags for sidebar
    const popularTags = await getPopularHashtags(10);
    
    // Render the page
    const html = templateEngine.render('timeline', {
      pageTitle: `#${tagName} - Sasha Bondar`,
      posts: postsResult.rows,
      hashtag: hashtag,
      popularHashtags: popularTags,
      activePage: 'tag'
    });
    
    res.send(html);
  } catch (error) {
    console.error('Error in tag route:', error);
    res.status(500).send(`<h1>500 - Server Error</h1><p>${error.message}</p>`);
  }
});

/**
 * Get popular hashtags (JSON endpoint)
 */
router.get('/api/hashtags/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const popularTags = await getPopularHashtags(parseInt(limit, 10));
    res.json(popularTags);
  } catch (error) {
    console.error('Error getting popular hashtags:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

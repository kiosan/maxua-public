// server/routes/translation.js
const express = require('express');
const router = express.Router();
const { pool, rateLimiterMiddleware, translateText } = require('../utils');

router.post('/translate', rateLimiterMiddleware, async (req, res) => {
  const { postId } = req.body;
  
  if (!postId) {
    return res.status(400).json({ error: 'No postId provided' });
  }

  try {
    const result = await pool.query('SELECT content FROM posts WHERE id = $1', [postId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const postContent = result.rows[0].content;
    
    // Translate the post content
    const translation = await translateText(postContent);
    return res.json({ translation });
  } catch (error) {
    console.error('Translation error:', error);
    return res.status(500).json({ error: 'Translation failed' });
  }
});

module.exports = router;

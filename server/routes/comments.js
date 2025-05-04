// routes/comments.js
const express = require('express');
const router = express.Router();

const { pool, rateLimiterMiddleware, sendEmail } = require('../utils');
const { v4: uuidv4 } = require('uuid');

// Add this endpoint to handle new comment submissions
router.post('/', rateLimiterMiddleware, async (req, res) => {
  try {
    const { postId, author, email, content } = req.body;
    
    // Basic validation
    if (!postId || !author || !content || content.trim() === '') {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate email format if provided
    if (email && !isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Insert comment into database
    const result = await pool.query(
      'INSERT INTO comments2 (post_id, author, email, content) VALUES ($1, $2, $3, $4) RETURNING id',
      [postId, author, email || null, content]
    );
    
    const commentId = result.rows[0].id;
    
    // Get post details for email notification
    const postResult = await pool.query(
      'SELECT preview_text, content FROM posts WHERE id = $1',
      [postId]
    );
    
    if (postResult.rows.length > 0) {
      const post = postResult.rows[0];
      
      // Generate subject line
      const subject = `Re: ${post.preview_text || post.content.substring(0, 50)}`;
      
      // Generate email body
      const emailBody = `
\n\n
${author} ${email} on post #${postId}:
\n\n
${content}

      `;
      
      await sendEmail({
        to: 'ischenko@gmail.com',
        subject,
        text: emailBody,
        reply_to: email // Set reply-to to commenter email if available
      });
    }
    
    return res.status(201).json({ 
      success: true, 
      message: 'Comment submitted successfully' 
    });
  } catch (error) {
    console.error('Error submitting comment:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Helper function to validate email
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

module.exports = router;

// routes/comments.js
const express = require('express');
const router = express.Router();

const { db, runQuery, rateLimiterMiddleware, sendEmail } = require('../utils');
const { v4: uuidv4 } = require('uuid');

// Add this endpoint to handle new comment submissions
router.post('/', rateLimiterMiddleware, async (req, res) => {
  try {
    const { postId, author, email, content } = req.body;
    
    // Basic validation
    if (!postId || !content || content.trim() === '') {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate email format if provided
    if (email && !isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Get post details 
    const postResult = await runQuery(
      'SELECT preview_text, content, slug FROM posts WHERE id = ?',
      [postId]
    );

    if (postResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid postId' });
    }

    const post = postResult.rows[0];
    
    // Insert comment into database
    const result = await runQuery(
      'INSERT INTO comments2 (post_id, author, email, content) VALUES (?, ?, ?, ?) RETURNING id',
      [postId, author || '', email || null, content]
    );
    
    // Extract the comment ID (with SQLite, this could be in rows[0].id or in lastInsertRowid)
    const commentId = result.rows[0]?.id || result.lastInsertRowid;
      
    const subject = `New comment on post #${postId}`;
    
    // Generate email body
    const emailBody = `
\n\n
${author} ${email} wrote:
\n\n
${content}

https://maxua.com/p/${postId}
    `;
    
    await sendEmail({
      to: 'obondar@gmail.com',
      subject,
      text: emailBody,
      reply_to: email // Set reply-to to commenter email if available
    });
    
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

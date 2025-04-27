// routes/comments.js
const express = require('express');
const router = express.Router();

const { pool } = require('../utils');
const { v4: uuidv4 } = require('uuid');
const { rateLimiterMiddleware } = require('../middleware/rateLimiter');
const { sendEmail } = require('../sendEmail');

// Get comments for a post
router.get('/', rateLimiterMiddleware, async (req, res) => {
  try {
    const postId = req.query.postId;
    if (!postId) {
      return res.status(400).json({ error: 'Missing postId' });
    }

    const { rows } = await pool.query(
      `SELECT author, content, created_at, author_reply
       FROM comments
       WHERE post_id = $1 AND confirmed = true
       ORDER BY created_at ASC`,
      [postId]
    );

    return res.json(rows);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Create a new comment
router.post('/', rateLimiterMiddleware, async (req, res) => {
  try {
    const { postId, anonId, author, email, content } = req.body;

    if (!postId || !anonId || !content || !author) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user is banned
    const bannedCheckQuery = `
      SELECT 1 FROM verified_commenters 
      WHERE ((email = $1 AND email != '') OR anon_id = $2) AND is_banned = TRUE
      LIMIT 1
    `;
    const bannedResult = await pool.query(bannedCheckQuery, [email || '', anonId]);
    
    if (bannedResult.rows.length > 0) {
      // Silently accept but don't store the comment
      // This makes the spammer think their comment went through
      console.log(`Another comment from (spammer) ${email} ${author} -- ignored`);
      return res.json({ 
        success: true,
        confirmed: false
      });
    }

    // Check if user has any CONFIRMED comments
    const isVerified = await hasConfirmedComments(anonId, email);
    const shouldAutoConfirm = isVerified;

    // Generate a secure random token for approval
    const token = uuidv4();

    // Insert the comment
    const result = await pool.query(
      `INSERT INTO comments (post_id, anon_id, author, email, content, confirmed, token)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [postId, anonId, author, email || '', content, shouldAutoConfirm, token]
    );
    
    const commentId = result.rows[0].id;

    // Store commenter details so we can recognize them next time
    // We do this even if they aren't verified yet
    await pool.query(
      'INSERT INTO verified_commenters (email, anon_id, name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [email || '', anonId, author]
    );

    // Send admin notification email
    await sendAdminNotification({
      author,
      email: email || 'Not provided',
      content,
      postId,
      commentId,
      isVerified,
      token
    });

    return res.json({ 
      success: true,
      confirmed: shouldAutoConfirm
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Auto-approve a comment by ID via a secure token link
router.get('/auto-approve', async (req, res) => {
  try {
    const { commentId, token } = req.query;

    if (!commentId || !token) {
      return res.status(400).send('Missing comment ID or security token');
    }
    
    // Get the comment to verify it exists and get its details for updating
    const commentResult = await pool.query(
      'SELECT id, post_id, email, anon_id, author, token FROM comments WHERE id = $1',
      [commentId]
    );
    
    if (commentResult.rows.length === 0) {
      return res.status(404).send('Comment not found');
    }
    
    const comment = commentResult.rows[0];

    // Verify that the token matches
    if (comment.token !== token) {
      return res.status(403).send('Invalid security token');
    }
    
    // Update the comment to confirmed status
    await pool.query(
      'UPDATE comments SET confirmed = true WHERE id = $1',
      [commentId]
    );
    
    // For existing commenters, update the record if the name or email has changed
    await pool.query(`
      INSERT INTO verified_commenters (email, anon_id, name) 
      VALUES ($1, $2, $3)
      ON CONFLICT (email, anon_id) 
      DO UPDATE SET name = $3
    `, [comment.email || '', comment.anon_id, comment.author]);
    
    // Return a simple success page
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Comment Approved</title>
      </head>
      <body>
        <div class="container">
          <h1>Comment Approved</h1>
          <p>The comment from ${comment.author} ${comment.email} has been approved and is now visible on your blog.</p>
          <p>The commenter has also been verified for future comments.</p>
          <p><a href="https://maxua.com/p/${comment.post_id}#comments">Return to the post</a></p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error approving comment:', error);
    return res.status(500).send('Server error');
  }
});

// Helper function to check if a commenter has any confirmed comments
async function hasConfirmedComments(anonId, email) {
  if (!anonId) return false;
  
  try {
    let query, params;
    
    if (email) {
      // Check if there are any confirmed comments from this anon_id OR email
      query = `
        SELECT 1 FROM comments 
        WHERE (anon_id = $1 OR email = $2) 
        AND confirmed = true 
        LIMIT 1
      `;
      params = [anonId, email];
    } else {
      // If no email provided, just check anon_id
      query = `
        SELECT 1 FROM comments 
        WHERE anon_id = $1 
        AND confirmed = true 
        LIMIT 1
      `;
      params = [anonId];
    }
    
    const { rowCount } = await pool.query(query, params);
    return rowCount > 0;
  } catch (error) {
    console.error('Error checking verified commenter:', error);
    return false;
  }
}

// Send notification email to admin
async function sendAdminNotification({ author, email, content, postId, commentId, isVerified, token }) {
  try {
    const subject = `[${commentId}] New comment! ${isVerified ? '✅' : '⏳'}`;
    
    // Create HTML content for the email with conditional approval status
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px;">
        
        <div style="margin: 20px 0; padding: 15px; border-left: 3px solid #1a73e8; background-color: #f8f9fa;">
          ${content.replace(/\n/g, '<br>')}
        </div>

        <p>${author} (${email || 'No email provided'})</p>
        
        ${isVerified ? 
          `<p style="color: #2e7d32;">✅ Auto-approved </p>` : 
          `<p style="color: #f57c00;">⏳ <a href="https://maxua.com/api/comments/auto-approve?commentId=${commentId}&token=${token}">Click here to approve</a></p>`
        }
        
        <p><a href="https://maxua.com/p/${postId}#comments">View on blog</a></p>
      </div>
    `;

    await sendEmail({
      to: 'ischenko@gmail.com',
      reply_to: email || undefined,
      subject,
      text: content,
      html
    });
    
    console.log(`Admin notification sent for comment by ${author}`);
  } catch (error) {
    console.error('Error sending admin notification:', error);
    // Don't fail the comment creation if notification fails
  }
}

module.exports = router;

// routes/auth.js
const express = require('express');
const router = express.Router();
const { pool } = require('../utils');
const { rateLimiterMiddleware } = require('../middleware/rateLimiter');

// Login route
router.post('/', rateLimiterMiddleware, async (req, res) => {
  try {
    const { password, deviceInfo } = req.body;
    const expectedPassword = process.env.ADMIN_PASSWORD;
    
    if (!expectedPassword) {
      return res.status(500).json({ error: 'Missing ADMIN_PASSWORD environment variable' });
    }
    
    if (password !== expectedPassword) {
      return res.status(401).json({ success: false, error: 'Invalid password' });
    }
    
    // Create a new session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration
    
    const result = await pool.query(
      'INSERT INTO sessions (expires_at, device_info) VALUES ($1, $2) RETURNING id',
      [expiresAt, deviceInfo || 'Unknown']
    );
    
    // Log the new session
    await pool.query(
      'INSERT INTO activity_log(type, session_id, data) VALUES ($1, $2, $3)',
      ['session', result.rows[0].id, { device: deviceInfo || 'Unknown' }]
    );
    
    // Set HttpOnly cookie
    const sessionId = result.rows[0].id;
    const isDevEnvironment = process.env.NODE_ENV !== 'production';
    const secure = !isDevEnvironment;
    
    res.cookie('auth_token', sessionId, {
      httpOnly: true,
      secure,
      expires: expiresAt,
      sameSite: 'Lax',
      path: '/',
      domain: req.headers.host?.includes('localhost') ? undefined : '.maxua.com'
    });
    
    return res.json({
      success: true,
      sessionId,
      expiresAt
    });
  } catch (error) {
    console.error('Error in auth:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Verify auth status
router.get('/', async (req, res) => {
  try {
    // Get session ID from cookie or query parameter for backward compatibility
    const sessionId = req.cookies?.auth_token || req.query.sessionId;
    
    if (!sessionId) {
      return res.json({ valid: false });
    }
    
    // Check session validity in database
    const result = await pool.query(
      'SELECT id FROM sessions WHERE id = $1 AND expires_at > NOW()',
      [sessionId]
    );
    
    const isValid = result.rows.length > 0;
    
    // If session is valid but using query parameter, set a cookie for future requests
    if (isValid && req.query.sessionId && !req.cookies?.auth_token) {
      const sessionResult = await pool.query(
        'SELECT expires_at FROM sessions WHERE id = $1',
        [sessionId]
      );
      
      if (sessionResult.rows.length > 0) {
        const isDevEnvironment = process.env.NODE_ENV !== 'production';
        const secure = !isDevEnvironment;
        
        res.cookie('auth_token', sessionId, {
          httpOnly: true,
          secure,
          expires: new Date(sessionResult.rows[0].expires_at),
          sameSite: 'Lax',
          path: '/',
          domain: req.headers.host?.includes('localhost') ? undefined : '.maxua.com'
        });
      }
    }
    
    return res.json({ valid: isValid });
  } catch (error) {
    console.error('Error checking auth:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Logout/revoke sessions
router.delete('/', async (req, res) => {
  try {
    const { password } = req.body;
    const expectedPassword = process.env.ADMIN_PASSWORD;
    
    if (!expectedPassword) {
      return res.status(500).json({ error: 'Missing ADMIN_PASSWORD environment variable' });
    }
    
    if (password !== expectedPassword) {
      return res.status(401).json({ success: false, error: 'Invalid password' });
    }
    
    // Delete all sessions
    await pool.query('DELETE FROM sessions');
    
    // Clear auth cookie
    res.clearCookie('auth_token', {
      path: '/',
      domain: req.headers.host?.includes('localhost') ? undefined : '.maxua.com'
    });
    
    return res.json({ success: true, message: 'All sessions cleared' });
  } catch (error) {
    console.error('Error in logout:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

module.exports = router;

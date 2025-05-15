// routes/auth.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db, runQuery, rateLimiterMiddleware } = require('../utils');

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
    
    // Create a new session with UUID as ID
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 365); // never expire (1 year)
    
    // Convert the Date object to ISO string for SQLite storage
    const expiresAtStr = expiresAt.toISOString();
    const sessionId = crypto.randomUUID();
    
    await runQuery(
      'INSERT INTO sessions (id, expires_at, device_info) VALUES (?, ?, ?)',
      [sessionId, expiresAtStr, deviceInfo || 'Unknown']
    );
    
    // Set HttpOnly cookie
    const isDevEnvironment = process.env.NODE_ENV !== 'production';
    const secure = !isDevEnvironment;
    
    res.cookie('auth_token', sessionId, {
      httpOnly: true,
      secure,
      expires: expiresAt,
      sameSite: 'Lax',
      path: '/',
      domain: req.headers.host?.includes('localhost') ? undefined : '.sbondar.com'
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
    const result = await runQuery(
      "SELECT id FROM sessions WHERE id = ? AND expires_at > datetime('now')",
      [sessionId]
    );
    
    const isValid = result.rows.length > 0;
    
    // If session is valid but using query parameter, set a cookie for future requests
    if (isValid && req.query.sessionId && !req.cookies?.auth_token) {
      const sessionResult = await runQuery(
        'SELECT expires_at FROM sessions WHERE id = ?',
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
    await runQuery('DELETE FROM sessions');
    
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

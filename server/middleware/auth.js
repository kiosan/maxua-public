// middleware/auth.js
const { pool } = require('../utils');

const authMiddleware = async (req, res, next) => {
  try {
    // Check for development environment bypass
    const isDevEnvironment = process.env.CONTEXT === 'dev' || 
                           (req.headers.host && (req.headers.host.includes('localhost') || 
                                               req.headers.host.includes('127.0.0.1')));
    
    if (isDevEnvironment && req.headers['x-dev-bypass'] === 'true') {
      return next();
    }
    
    // Get session ID from cookie or query parameter
    const sessionId = req.cookies?.auth_token || req.query.sessionId;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check session validity
    const result = await pool.query(
      'SELECT id FROM sessions WHERE id = $1 AND expires_at > NOW()',
      [sessionId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    // Authentication successful
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

module.exports = { authMiddleware };

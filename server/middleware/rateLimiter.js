// middleware/rateLimiter.js
const { rateLimit } = require('../utils');

const rateLimiterMiddleware = (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || 'unknown';
  const key = `express-api:${ip}`;
  
  if (!rateLimit(key, 20, 60000)) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
  
  next();
};

module.exports = { rateLimiterMiddleware };

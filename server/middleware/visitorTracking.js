// Referrer tracking middleware - simplified to track only traffic sources
const { runQuery } = require('../utils');

/**
 * Middleware to track referrers only
 * Compatible with SQLite database structure
 */
async function referrerTrackingMiddleware(req, res, next) {
  try {
    // Skip tracking for non-GET requests, static files, and admin routes
    if (req.method !== 'GET' || 
        req.path.startsWith('/static') || 
        req.path.startsWith('/css') || 
        req.path.startsWith('/js') || 
        req.path.startsWith('/images') ||
        req.path.startsWith('/admin') ||
        req.path.includes('favicon')) {
      return next();
    }

    // Extract referrer and basic user agent info
    const referrer = req.headers['referer'] || '';
    const userAgent = req.headers['user-agent'] || '';
    const path = req.path;

    // Only track external referrers
    if (referrer) {
      // Get our own hostname from request or config
      const host = req.headers.host;
      let referrerUrl;
      
      try {
        // Parse the referrer URL
        referrerUrl = new URL(referrer);
        
        // Check if referrer is from a different domain (external)
        // Compare hostname without www prefix to handle both www.domain.com and domain.com
        const referrerHost = referrerUrl.hostname.replace(/^www\./, '');
        const ourHost = host.replace(/^www\./, '').split(':')[0]; // Remove port if present
        
        // Only track if external referrer
        if (referrerHost !== ourHost) {
          // Insert referrer stats using SQLite-compatible query
          await runQuery(`
            INSERT INTO referrer_stats (referrer, path, user_agent)
            VALUES (?, ?, ?)
          `, [referrer, path, userAgent]);
        }
      } catch (error) {
        // Invalid URL format - skip tracking
        console.error('Invalid referrer URL format:', referrer);
      }
    }

  } catch (error) {
    // Log error but don't interrupt request
    console.error('Error tracking referrer:', error);
  }

  next();
}

module.exports = referrerTrackingMiddleware;

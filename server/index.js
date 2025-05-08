// index.js - Main Express app for Fly.io deployment
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const Sentry = require('@sentry/node');
const { pool, rateLimiterMiddleware, authMiddleware } = require('./utils');

// Import route modules
const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const draftsRoutes = require('./routes/drafts');
const commentsRoutes = require('./routes/comments');
const newsletterRoutes = require('./routes/newsletter');
const feedsRoutes = require('./routes/feeds');

// Import serverless adapters for SSR pages
const postPage = require('./postPage');
const timelinePage = require('./timelinePage');
const searchPage = require('./searchPage');
const composePage = require('./composePage');
const sitemap = require('./sitemap');

// Create Express app
const app = express();

// Initialize Sentry with just the minimal required options
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: true, 
  environment: process.env.NODE_ENV || 'development'
});

// Basic Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true })); // for HTMX

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});


// Add this test route after your other routes to test Sentry
app.get('/api/debug-sentry', (req, res) => {
  try {
    throw new Error('Testing Sentry integration');
  } catch (error) {
    Sentry.captureException(error);
    res.status(200).json({
      message: 'Sentry test error triggered',
      note: 'Check your Sentry dashboard to confirm this error was captured'
    });
  }
});

// Add this error handler before starting the server
app.use((err, req, res, next) => {
  Sentry.captureException(err);
  console.error('Unhandled error:', err);
  res.status(500).send(`<h1>500 - Server Error</h1><p>${err.message || 'Something went wrong'}</p>`);
});

// Mount the route modules
app.use('/api/auth', authRoutes);
app.use('/api', postsRoutes); // Will handle /publish, /views, /topics 
app.use('/api/comments', commentsRoutes);
app.use('/api/drafts', draftsRoutes);
app.use('/api', newsletterRoutes); // Will handle /subscribe, /confirmSubscription, /unsubscribe
app.use('/', feedsRoutes); // Will handle /rss

// STATIC paths - from Netlify
const path = require('path');

// For specific file types, set longer cache times
app.use('/css', express.static(path.join(__dirname, '../public/css'), {
  //maxAge: '1d'
}));

app.use('/js', express.static(path.join(__dirname, '../public/js'), {
  //maxAge: '1d' 
}));

app.use('/images', express.static(path.join(__dirname, '../public/images'), {
  maxAge: '1y' // Cache images for a year
}));

// Catch-all fallback for other static files (e.g. favicon, robots.txt)
app.use(express.static(path.join(__dirname, '../public')));

// My substack newsletter archive

app.get(['/newsletter_archive/'], (req, res) => {
  res.sendFile(path.join(__dirname, '../public/newsletter_archive/index.html'));
});

// Simplr static HTML page handler
app.get(['/test_auth', '/books', '/about', '/zsu'], (req, res) => {
  const pageName = req.path.substring(1);
  res.sendFile(path.join(__dirname, '../public', `${pageName}.html`));
});

app.get('/admin', authMiddleware, (req, res) => {
  const pageName = req.path.substring(1);
  res.sendFile(path.join(__dirname, '../public', `${pageName}.html`));
});

// Create adapter for SSR page handlers
function createServerlessAdapter(pageHandler) {
  return async (req, res) => {
    try {
      // Create a compatible event object that mimics the serverless function event
      const event = {
        path: req.path,
        httpMethod: req.method,
        headers: req.headers,
        queryStringParameters: req.query,
        body: req.body ? JSON.stringify(req.body) : null,
        // Ensure cookies are properly passed
        cookies: req.cookies || {},
        // Add path parameters from Express
        pathParameters: req.params,
        // Add the original URL (some handlers might use this)
        rawUrl: req.originalUrl
      };
      
      // Call the existing page handler
      const result = await pageHandler.handler(event, {});
      
      // If the handler returns nothing or undefined, handle gracefully
      if (!result) {
        console.error(`Handler returned empty result for ${req.path}`);
        return res.status(500).send('<h1>500 - Server Error</h1><p>No response from handler</p>');
      }
      
      // Handle redirect responses
      if (result.statusCode >= 300 && result.statusCode < 400 && result.headers?.Location) {
        return res.redirect(result.statusCode, result.headers.Location);
      }
      
      // Set status code from the result
      res.status(result.statusCode || 200);
      
      // Set headers from the result
      if (result.headers) {
        Object.entries(result.headers).forEach(([key, value]) => {
          // Skip setting null or undefined headers
          if (value != null) {
            res.set(key, value);
          }
        });
      }
      
      // Send the response body
      if (result.body) {
        res.send(result.body);
      } else {
        // Handle empty body
        res.end();
      }
    } catch (error) {
      console.error(`Error handling ${req.path}:`, error);
      res.status(500).send(`<h1>500 - Server Error</h1><p>${error.message}</p>`);
    }
  };
}

// Set up SSR routes using the adapter
app.get('/search', createServerlessAdapter(searchPage));
app.get('/', createServerlessAdapter(timelinePage));
app.get('/t/:topic', createServerlessAdapter(timelinePage));
app.get('/compose', createServerlessAdapter(composePage));
app.get('/sitemap.xml', createServerlessAdapter(sitemap));

// single page route
// handles old /p/{id} style and slug redirects for SEO
// also, still uses createServerlessAdapter legacy code
app.get(['/p/:id(\\d+)', '/p/:slug([\\w\\-]+)-:id(\\d+)'], async (req, res, next) => {
  try {
    const { id, slug = '' } = req.params;
    const result = await pool.query('SELECT slug FROM posts WHERE id = $1', [id]);
    
    // Redirect only if we have a post with a slug that differs from the URL
    if (result.rows.length > 0 && result.rows[0].slug && result.rows[0].slug !== slug) {
      return res.redirect(301, `/p/${result.rows[0].slug}-${id}`);
    }
    
    // Otherwise, process the request normally
    createServerlessAdapter(postPage)(req, res, next);
  } catch (error) {
    next(error);
  }
});

const translationRoutes = require('./routes/translation');
app.use('/api', translationRoutes);

const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

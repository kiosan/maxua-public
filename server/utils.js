// functions/utils.js
require('dotenv').config();
const crypto = require('crypto');
const Sentry = require('@sentry/node');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

// Ensure the database directory exists
const dbDirectory = path.resolve(process.cwd(), 'database');
if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

// Create SQLite database connection
const dbPath = process.env.DATABASE_URL || path.join(dbDirectory, 'sbondar.sqlite');
const db = new Database(dbPath, { verbose: process.env.NODE_ENV === 'development' ? console.log : null });

// Enable foreign keys
db.pragma('foreign_keys = ON');

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
    const stmt = db.prepare("SELECT id FROM sessions WHERE id = ? AND expires_at > datetime('now')");
    const result = stmt.get(sessionId);
    
    if (!result) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    // Authentication successful
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

// SQLite doesn't need a keep-alive mechanism
// The connection is automatically maintained

const rateLimits = new Map();

function rateLimit(key, limit = 5, windowMs = 60000) {
  const now = Date.now();
  const bucket = rateLimits.get(key) || [];
  const recent = bucket.filter(ts => now - ts < windowMs);

  if (recent.length >= limit) return false;

  recent.push(now);
  rateLimits.set(key, recent);
  return true;
}

const rateLimiterMiddleware = (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || 'unknown';
  const key = `express-api:${ip}`;
  
  if (!rateLimit(key, 20, 60000)) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
  
  next();
};

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  };
}

/**
 * Compute a content hash based on data for ETag generation
 * @param {Object|Array} data - Data to generate hash from
 * @returns {string} - Hash string
 */
function computeContentHash(data) {
  // For posts/timelines, we care about IDs and timestamps
  let hashSource = '';
  
  if (Array.isArray(data)) {
    // For collections (like posts in timeline)
    hashSource = data.map(item => 
      `${item.id}:${new Date(item.created_at).getTime()}`
    ).join('|');
  } else if (data && data.id) {
    // For single items (like a post)
    hashSource = `${data.id}:${new Date(data.created_at).getTime()}`;
  } else {
    // Fallback for other data types
    hashSource = JSON.stringify(data);
  }
  
  // Create an MD5 hash (fast and sufficient for caching)
  return crypto.createHash('md5').update(hashSource).digest('hex');
}

/**
 * Get optimized cache headers based on content
 * @param {Object|Array} data - Data to generate ETag from
 * @returns {Object} - Cache headers
 */

function getETagHeaders(data = {}) {
  const contentHash = computeContentHash(data);
  const headers = {
    'Content-Type': 'text/html',
    'ETag': `"${contentHash}"`,
    'Vary': 'Accept-Encoding'
  };
  
  // Add Cache-Control headers -- unless we're in dev mode
  if (!isDevEnvironment()) {
    // XXX we need a better caching strategy
    // headers['Cache-Control'] = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';
    headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate';
    headers['Pragma'] = 'no-cache';
  } else {
    headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate';
    headers['Pragma'] = 'no-cache';
  }
  
  return headers;
}

function wrap(handler) {
  return async (event, context) => {
    const headers = getCorsHeaders();
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
    try {
      return await handler(event, context, headers);
    } catch (err) {
      console.error('Unhandled error:', err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: err.message || 'Server error' }),
      };
    }
  };
}

/**
 * Format a date in a clean, concise way
 * @param {string} dateStr - ISO date string
 * @return {string} Formatted date
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  
  // 11/4/2025, 16:28:46
  const options = { 
    year: 'numeric', 
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Europe/Kyiv'
  };
  
  return date.toLocaleString('en-GB', options);
}

function escapeHTML(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function linkify(text = '') {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return escapeHTML(text).replace(urlRegex, url => 
    `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
  );
}

function getIdFromPath(path, prefix) {
  if (!prefix) throw new Error('Missing prefix for getIdFromPath');
  const match = path.match(new RegExp(`${prefix}(\\d+)`));
  return match ? match[1] : null;
}

function isDevEnvironment() {
  return process.env.CONTEXT === 'dev';
}

/**
 * Safely capture errors with Sentry
 * @param {Error} error - The error to capture
 * @param {Object} contextData - Additional context data
 */
function captureError(error, contextData = {}) {
  try {
    // Add additional context if provided
    if (Object.keys(contextData).length > 0) {
      Sentry.configureScope(scope => {
        Object.entries(contextData).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      });
    }
    
    // Capture the error
    Sentry.captureException(error);
    
    // Always log to console as well for local visibility
    console.error(error);
  } catch (sentryError) {
    // Fallback if Sentry capture fails
    console.error('Original error:', error);
    console.error('Error capturing with Sentry:', sentryError);
  }
}

function closePool() {
  if (db) return db.close();
  return Promise.resolve();
}

async function sendEmail({ to, subject, text, html = null, reply_to = null }) {
  if (!to || !subject || !text) {
    throw new Error('Missing required fields: to, subject or text');
  }

  // Generate better HTML from plain text if not provided
  const generatedHtml = html || formatTextToHtml(text);

  // Build the email payload
  const emailPayload = {
    from: 'Sasha Bondar <hello@sbondar.com>',
    to,
    subject,
    text,
    html: generatedHtml
  };

  // Add reply_to if provided 
  if (reply_to) {
    emailPayload.replyTo = reply_to;
  }

  const { data, error } = await resend.emails.send(emailPayload);

  if (error) throw new Error(error.message);
  return data.id;
}

/**
 * Convert plain text with newlines to properly formatted HTML
 * @param {string} text - Plain text content
 * @returns {string} - Formatted HTML
 */
function formatTextToHtml(text) {
  if (!text) return '';
  
  // Split by double newlines to identify paragraphs
  const paragraphs = text.split(/\n\s*\n/);
  
  // Convert each paragraph to HTML and join
  return paragraphs
    .map(para => {
      // Skip empty paragraphs
      if (!para.trim()) return '';
      
      // Replace single newlines with <br> tags within paragraphs
      const formattedPara = para.replace(/\n/g, '<br>');
      
      return `<p>${formattedPara}</p>`;
    })
    .filter(Boolean) // Remove empty paragraphs
    .join('\n');
}

/**
 * Generate a URL-friendly slug from text
 * If text contains Cyrillic characters, translate it to English first
 * @param {string} text - The text to convert to a slug
 * @returns {string} - URL-friendly slug
 */
async function generateSlug(text) {
  if (!text) return '';
  
  // Check if text contains Cyrillic characters
  const hasCyrillic = /[а-яА-ЯіїєґІЇЄҐ]/.test(text);
  
  // If text has Cyrillic characters, translate it to English first
  let processedText = text;
  if (hasCyrillic) {
    try {
      // Use existing Azure translation service
      processedText = await translateText(text);
    } catch (error) {
      console.error('Translation error:', error);
      // Fall back to the original text if translation fails
    }
  }
  
  return processedText
    .toString()
    .toLowerCase()
    .trim()
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove numbers to avoid conflicting with post ID
    .replace(/[0-9]/g, '')
    // Remove special characters
    .replace(/[^\w\-]+/g, '')
    // Remove duplicate hyphens
    .replace(/\-\-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    // Limit length
    .substring(0, 30)
    // One final check for trailing hyphen (since previous operations might create one)
    .replace(/-+$/, '');
}

async function translateText(text) {
  const key = process.env.AZURE_TRANSLATOR_KEY;
  const endpoint = 'https://api.cognitive.microsofttranslator.com';
  const location = process.env.AZURE_TRANSLATOR_LOCATION || 'westeurope';
  
  // from=uk to force UA->EN translation
  // why? autodetect won't work if first half is in English :)
  const response = await fetch(`${endpoint}/translate?api-version=3.0&from=uk&to=en`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Ocp-Apim-Subscription-Region': location,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([{ text }])
  });
  
  if (!response.ok) {
    throw new Error(`Translation API error: ${response.status}`);
  }
  
  const result = await response.json();
  const translation = result[0]?.translations[0]?.text;

  return translation;
}

/**
 * Generate a permalink for a post
 * @param {Object} post - Post object with id and slug properties
 * @returns {string} - Permalink URL
 */
function getPostPermalink(post) {
  if (!post || !post.id) return '/';
  
  if (post.slug) {
    return `/p/${post.slug}-${post.id}`;
  }
  
  return `/p/${post.id}`;
}

/**
 * Helper function to execute SQLite queries with a PostgreSQL-like response interface
 * This makes transitioning from pg to better-sqlite3 easier
 * @param {string} query - SQL query with ? placeholders for parameters
 * @param {Array} params - Array of parameter values to be used in the query
 * @returns {Object} - Object with rows and rowCount properties similar to pg
 */
function runQuery(query, params = []) {
  try {
    // Convert PostgreSQL ?, ?, etc. params to SQLite ? params
    // This is a simplified conversion that handles basic cases
    const sqliteQuery = query.replace(/\$(\d+)/g, '?');
    
    // For statements that don't return data (INSERT, UPDATE, DELETE)
    if (sqliteQuery.toLowerCase().trim().startsWith('insert') ||
        sqliteQuery.toLowerCase().trim().startsWith('update') ||
        sqliteQuery.toLowerCase().trim().startsWith('delete')) {
      
      // Check if query has a RETURNING clause
      const hasReturning = sqliteQuery.toLowerCase().includes('returning');
      
      const stmt = db.prepare(sqliteQuery.replace(/\s+RETURNING\s+\*/i, ''));
      const info = stmt.run(...params);
      
      // If it's an INSERT with RETURNING clause, fetch the inserted row
      if (hasReturning && sqliteQuery.toLowerCase().trim().startsWith('insert')) {
        const tableName = sqliteQuery.toLowerCase().match(/insert\s+into\s+(\w+)/i)[1];
        const fetchStmt = db.prepare(`SELECT * FROM ${tableName} WHERE rowid = ?`);
        const insertedRow = fetchStmt.get(info.lastInsertRowid);
        
        return {
          rows: insertedRow ? [insertedRow] : [],
          rowCount: info.changes,
          lastInsertRowid: info.lastInsertRowid
        };
      }
      
      // If it's an UPDATE with RETURNING clause, fetch the updated row(s)
      if (hasReturning && sqliteQuery.toLowerCase().trim().startsWith('update')) {
        // Extract table name from UPDATE statement
        const tableName = sqliteQuery.toLowerCase().match(/update\s+(\w+)/i)[1];
        
        // Extract the WHERE clause to identify which rows were updated
        const whereMatch = sqliteQuery.match(/where\s+(.+?)(?:\s+returning|$)/i);
        if (whereMatch && whereMatch[1] && info.changes > 0) {
          const whereClause = whereMatch[1];
          
          // Create a query to fetch the updated rows
          const fetchStmt = db.prepare(`SELECT * FROM ${tableName} WHERE ${whereClause}`);
          
          // Use the same params since SQLite doesn't support RETURNING
          // This assumes the WHERE clause uses the same binding positions as the original query
          // Get the relevant params for the WHERE clause
          const whereParams = params.slice(params.length - whereClause.split('?').length + 1);
          
          try {
            const updatedRows = fetchStmt.all(...whereParams);
            return {
              rows: updatedRows,
              rowCount: info.changes,
              lastInsertRowid: null
            };
          } catch (error) {
            console.error('Error fetching updated rows:', error);
            // Default to empty result with changes count if fetch fails
            return {
              rows: [],
              rowCount: info.changes,
              lastInsertRowid: null
            };
          }
        }
      }
      
      return { 
        rows: [], 
        rowCount: info.changes,
        lastInsertRowid: info.lastInsertRowid
      };
    }
    
    // For SELECT statements
    const stmt = db.prepare(sqliteQuery);
    if (sqliteQuery.toLowerCase().includes('limit 1') || sqliteQuery.includes('= ?')) {
      // Likely expecting a single row
      const row = stmt.get(...params);
      return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
    } else {
      // Expecting multiple rows
      const rows = stmt.all(...params);
      return { rows, rowCount: rows.length };
    }
  } catch (error) {
    console.error('SQLite query error:', error);
    throw error;
  }
}

/**
 * Transliterate Cyrillic text to Latin characters
 * @param {string} text - The Cyrillic text to transliterate
 * @returns {string} - Transliterated text
 */
function transliterateCyrillic(text) {
  if (!text) return '';
  
  // Ukrainian and Russian Cyrillic to Latin mapping
  const cyrillicToLatin = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ie',
    'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'i', 'к': 'k', 'л': 'l',
    'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ь': '', 'ю': 'iu',
    'я': 'ia', 'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'H', 'Ґ': 'G', 'Д': 'D', 'Е': 'E',
    'Є': 'Ie', 'Ж': 'Zh', 'З': 'Z', 'И': 'Y', 'І': 'I', 'Ї': 'Yi', 'Й': 'I', 'К': 'K',
    'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T',
    'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ь': '',
    'Ю': 'Iu', 'Я': 'Ia', 'ы': 'y', 'Ы': 'Y', 'э': 'e', 'Э': 'E', 'ё': 'e', 'Ё': 'E'
  };
  
  // Replace each Cyrillic character with its Latin equivalent
  return text.split('').map(char => cyrillicToLatin[char] || char).join('');
}

/**
 * Generate a URL-friendly slug from text
 * @param {string} text - The text to convert to a slug
 * @param {boolean} transliterate - Whether to transliterate Cyrillic text (default: true)
 * @returns {string} - URL-friendly slug
 */
function generateSlug(text, shouldTransliterate = true) {
  if (!text) return '';
  
  // Check if text contains Cyrillic characters
  const hasCyrillic = /[а-яА-ЯіїєґІЇЄҐ]/.test(text);
  
  // If text has Cyrillic characters and transliteration is enabled, transliterate it
  let processedText = text;
  if (hasCyrillic && shouldTransliterate) {
    processedText = transliterateCyrillic(text);
  }
  
  return processedText
    .toString()
    .toLowerCase()
    .trim()
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove special characters
    .replace(/[^\w\-]+/g, '')
    // Remove duplicate hyphens
    .replace(/\-\-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    // Limit length
    .substring(0, 100);
}

/**
 * Translate text using Azure Translator API (for slug generation with translation)
 * Use this only if transliteration is not sufficient
 * @param {string} text - The text to translate
 * @returns {Promise<string>} - Translated text
 */
async function translateText(text) {
  if (!process.env.AZURE_TRANSLATOR_KEY) {
    console.warn('AZURE_TRANSLATOR_KEY not set - falling back to transliteration');
    return transliterateCyrillic(text);
  }

  const key = process.env.AZURE_TRANSLATOR_KEY;
  const endpoint = 'https://api.cognitive.microsofttranslator.com';
  const location = process.env.AZURE_TRANSLATOR_LOCATION || 'westeurope';
  
  try {
    // from=uk to force UA->EN translation
    const response = await fetch(`${endpoint}/translate?api-version=3.0&from=uk&to=en`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Ocp-Apim-Subscription-Region': location,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{ text }])
    });
    
    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }
    
    const result = await response.json();
    return result[0]?.translations[0]?.text || '';
  } catch (error) {
    console.error('Translation error:', error);
    return transliterateCyrillic(text);  // Fall back to transliteration
  }
}

module.exports = { 
  db, 
  runQuery, // Add the query helper function
  wrap, 
  sendEmail,
  rateLimit,
  getCorsHeaders, 
  getETagHeaders,
  escapeHTML, 
  linkify, 
  formatDate,
  getIdFromPath, 
  isDevEnvironment,
  captureError,
  authMiddleware,
  // Add the new slug generation utilities
  generateSlug,
  transliterateCyrillic,
  translateText,
  rateLimiterMiddleware,
  getPostPermalink,
  closePool
};

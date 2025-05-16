// routes/feeds.js
const express = require('express');
const router = express.Router();
const { pool } = require('../utils');

// RSS feed
router.get('/rss', async (req, res) => {
  try {
    // Get the 20 most recent posts
    const result = await runQuery(`
      SELECT * FROM posts p
      WHERE p.status='public'
      ORDER BY p.created_at DESC
      LIMIT 20
    `);
    
    // Generate RSS feed
    const rss = generateRSS(result.rows);
    
    // Set headers and send response
    res.set('Content-Type', 'application/rss+xml');
    res.set('Cache-Control', 'public, max-age=1800'); // 30 minutes cache
    res.send(rss);
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    res.status(500).send('Error generating RSS feed');
  }
});

/**
 * Generate RSS feed XML from posts
 * @param {Array} posts - List of post objects
 * @returns {string} RSS XML
 */
function generateRSS(posts) {
  // RSS 2.0 format
  let rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Sasha Bondar's Blog</title>
  <link>https://sbondar.com</link>
  <description>Thoughts on startups, tech, and more by Sasha Bondar</description>
  <language>uk-ua, en</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  <atom:link href="https://sbondar.com/rss" rel="self" type="application/rss+xml" />
`;

  // Add items
  posts.forEach(post => {
    const postDate = new Date(post.created_at).toUTCString();
    const postUrl = `https://sbondar.com/p/${post.id}`;
    
    // Escape HTML entities in content
    const content = post.content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
    // Create title from content (truncate if needed)
    let title = content.replace(/\n/g, ' ').trim();
    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }
    
    // Convert URLs to clickable links for description
    const contentWithLinks = content.replace(
      /(https?:\/\/[^\s]+)/g, 
      url => `<a href="${url}">${url}</a>`
    );
    
    // Add item to RSS feed
    rss += `  <item>
    <title>${title}</title>
    <link>${postUrl}</link>
    <guid>${postUrl}</guid>
    <pubDate>${postDate}</pubDate>
    <description><![CDATA[${contentWithLinks.replace(/\n/g, '<br>')}]]></description>
  </item>
`;
  });

  // Close tags
  rss += `</channel>
</rss>`;

  return rss;
}

module.exports = router;

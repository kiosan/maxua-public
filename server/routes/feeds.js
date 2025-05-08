// routes/feeds.js
const express = require('express');
const router = express.Router();
const { pool } = require('../utils');

// RSS feed
router.get('/rss', async (req, res) => {
  try {
    // Get the 20 most recent posts
    const result = await pool.query(`
      SELECT p.*, t.name as topic_name, t.slug as topic_slug
      FROM posts p
      LEFT JOIN topics t ON p.topic_id = t.id
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
  <title>Max Ischenko's Blog</title>
  <link>https://maxua.com</link>
  <description>Thoughts on startups, tech, and more by Max Ischenko</description>
  <language>uk-ua, en</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  <atom:link href="https://maxua.com/rss" rel="self" type="application/rss+xml" />
`;

  // Add items
  posts.forEach(post => {
    const postDate = new Date(post.created_at).toUTCString();
    const postUrl = `https://maxua.com/p/${post.id}`;
    
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
    
    // Add topic tag if available
    let topicInfo = '';
    if (post.topic_name) {
      topicInfo = `<br><br><small>Topic: #${post.topic_name}</small>`;
    }
    
    // Add item to RSS feed
    rss += `  <item>
    <title>${title}</title>
    <link>${postUrl}</link>
    <guid>${postUrl}</guid>
    <pubDate>${postDate}</pubDate>
    <description><![CDATA[${contentWithLinks.replace(/\n/g, '<br>')}${topicInfo}]]></description>
  </item>
`;
  });

  // Close tags
  rss += `</channel>
</rss>`;

  return rss;
}

module.exports = router;

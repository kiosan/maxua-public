// functions/sitemap.js
const { db, runQuery } = require('./utils');

/**
 * Generate a sitemap.xml for the site
 */
exports.handler = async (event, context) => {
  try {
    // Start building the sitemap XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    // Add static pages
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/about', priority: '0.8', changefreq: 'monthly' },
      { url: '/books', priority: '0.7', changefreq: 'weekly' },
      { url: '/zsu', priority: '0.6', changefreq: 'monthly' }
    ];
    
    for (const page of staticPages) {
      xml += `  <url>\n`;
      xml += `    <loc>https://maxua.com${page.url}</loc>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    }
    
    // Get topics with the latest post date for each topic
    // This gives us a better "last modified" date for each topic page
    const topicResult = await runQuery(`
      SELECT t.slug, t.created_at, MAX(p.created_at) as last_post_date
      FROM topics t
      LEFT JOIN posts p ON t.id = p.topic_id
      GROUP BY t.id, t.slug, t.created_at
    `);
    
    for (const topic of topicResult.rows) {
      // Use the most recent date between topic creation and its latest post
      const lastmod = topic.last_post_date 
        ? new Date(topic.last_post_date).toISOString() 
        : new Date(topic.created_at).toISOString();
      
      xml += `  <url>\n`;
      xml += `    <loc>https://maxua.com/t/${topic.slug}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    }
    
    // Add all posts
    const postResult = await runQuery(`
      SELECT id, created_at 
      FROM posts 
      ORDER BY created_at DESC LIMIT 100
    `);
    
    for (const post of postResult.rows) {
      const lastmod = new Date(post.created_at).toISOString();
      
      xml += `  <url>\n`;
      xml += `    <loc>https://maxua.com/p/${post.id}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>monthly</changefreq>\n`;
      xml += `    <priority>0.6</priority>\n`;
      xml += `  </url>\n`;
    }
    
    // Also add the home page with the most recent post date
    if (postResult.rows.length > 0) {
      const latestPost = postResult.rows[0]; // Already ordered by created_at DESC
      const homeLastmod = new Date(latestPost.created_at).toISOString();
      
      xml += `  <url>\n`;
      xml += `    <loc>https://maxua.com/</loc>\n`;
      xml += `    <lastmod>${homeLastmod}</lastmod>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>1.0</priority>\n`;
      xml += `  </url>\n`;
    }
    
    // Close the sitemap
    xml += '</urlset>';
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600' // a little cache can't hurt
      },
      body: xml
    };
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return {
      statusCode: 500,
      body: 'Error generating sitemap: ' + error.message
    };
  }
};

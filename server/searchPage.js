// functions/searchPage.js
const { pool, getCorsHeaders, escapeHTML, formatDate } = require('./utils');
const templateEngine = require('./templateEngine');
const { generateMetaTags } = require('./seo');

templateEngine.registerPartial('search', 'search');

console.log('searchPage.js loaded');

/**
 * Fetch the most popular posts from the last 30 days
 */
async function fetchPopularPosts(limit = 10) {
  try {
    // Get posts with the most views in the last 30 days
    const result = await pool.query(`
      SELECT 
        p.id, 
        p.content, 
        p.created_at,
        t.name as topic_name, 
        t.slug as topic_slug,
        COUNT(DISTINCT pv.anon_id) as view_count
      FROM posts p
      LEFT JOIN topics t ON p.topic_id = t.id
      JOIN page_views pv ON p.id = pv.post_id
      WHERE pv.viewed_at > NOW() - INTERVAL '30 days'
      GROUP BY p.id, t.name, t.slug
      ORDER BY view_count DESC
      LIMIT $1
    `, [limit]);
    
    // Format the posts for display
    return result.rows.map(post => {
      // Create a clean preview for display
      const preview = post.content.length > 60 
        ? post.content.substring(0, 60) + '...' 
        : post.content;
        
      return {
        ...post,
        formatted_date: formatDate(post.created_at),
        preview
      };
    });
  } catch (error) {
    console.error('Error fetching popular posts:', error);
    return [];
  }
}

/**
 * Handler for search page requests
 */
exports.handler = async (event, context) => {
  try {
    // Get query parameters
    const query = event.queryStringParameters || {};
    const searchTerm = query.q || '';
    const topicId = query.topic || null;
    const limit = parseInt(query.limit) || 10;
    const offset = parseInt(query.offset) || 0;
    
    // Initialize empty result sets
    let posts = [];
    let totalCount = 0;
    let currentTopic = null;
    
    // Fetch popular posts in parallel with other DB operations
    const popularPostsPromise = fetchPopularPosts(5);
    
    // If we have a search term, perform the search
    if (searchTerm.trim()) {
      // Build search query
      let sqlQuery = `
        SELECT 
          p.*, 
          t.name as topic_name, 
          t.slug as topic_slug
        FROM posts p
        LEFT JOIN topics t ON p.topic_id = t.id
        WHERE 
          p.content ILIKE $1
      `;
      
      // Parameters for the query
      const queryParams = [`%${searchTerm}%`];
      let paramIndex = 2;
      
      // Add topic filter if specified
      if (topicId) {
        sqlQuery += ` AND p.topic_id = $${paramIndex++}`;
        queryParams.push(topicId);
        
        // Get topic info for display
        const topicResult = await pool.query(
          'SELECT id, name, slug, description FROM topics WHERE id = $1',
          [topicId]
        );
        
        if (topicResult.rows.length > 0) {
          currentTopic = topicResult.rows[0];
        }
      }
      
      // Add ordering and pagination
      sqlQuery += ` ORDER BY p.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      queryParams.push(limit, offset);
      
      // Execute the search query
      const result = await pool.query(sqlQuery, queryParams);
      
      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) 
        FROM posts p
        WHERE p.content ILIKE $1
        ${topicId ? 'AND p.topic_id = $2' : ''}
      `;
      
      const countParams = [`%${searchTerm}%`];
      if (topicId) {
        countParams.push(topicId);
      }
      
      const countResult = await pool.query(countQuery, countParams);
      totalCount = parseInt(countResult.rows[0].count);
      
      // Format posts for display
      posts = result.rows.map(post => {
        // Format date
        const formattedDate = formatDate(post.created_at);
        
        // Highlight the search term in content
        // First escape HTML to prevent XSS
        const escapedContent = escapeHTML(post.content);
        
        // Create a simple highlighting without breaking HTML
        const searchRegex = new RegExp(`(${escapeHTML(searchTerm)})`, 'gi');
        const highlightedContent = escapedContent.replace(
          searchRegex,
          '<span class="highlight">$1</span>'
        );
        
        // Convert URLs to links
        const contentWithLinks = highlightedContent.replace(
          /(https?:\/\/[^\s]+)/g,
          url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
        );
        
        return {
          ...post,
          formatted_date: formattedDate,
          highlighted_content: contentWithLinks
        };
      });
    }
    
    // Fetch topics for the filter dropdown
    const topicsResult = await pool.query('SELECT id, name, slug FROM topics ORDER BY name ASC');
    const topics = topicsResult.rows;
    
    // Get popular posts (await the promise we started earlier)
    const popularPosts = await popularPostsPromise;
    
    // Set page title and meta description
    const pageTitle = searchTerm
      ? `Search results for "${searchTerm}" - Max Ischenko`
      : 'Search - Max Ischenko';
    
    const metaDescription = searchTerm
      ? `Search results for "${searchTerm}" on Max Ischenko's blog`
      : `Search Max Ischenko's blog for posts about startups, tech, and more`;
    
    // Generate meta tags
    const metaTags = generateMetaTags({
      title: pageTitle,
      description: metaDescription,
      url: 'https://maxua.com/search',
      // Set noindex for search pages to avoid search engine indexing
      robots: 'noindex, follow'
    });
    
    // Prepare template data
    const templateData = {
      posts,
      topics,
      currentTopic,
      popularPosts,
      pagination: {
        total: totalCount,
        offset,
        limit,
        hasMore: offset + limit < totalCount
      },
      query: {
        term: searchTerm,
        topic: topicId
      },
      pageTitle,
      metaTags
    };
    
    // Render the search page
    const html = templateEngine.render('search', templateData);
    
    return {
      statusCode: 200,
      headers: {
        ...getCorsHeaders(),
        'Content-Type': 'text/html',
        // Don't cache search results
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      },
      body: html
    };
  } catch (error) {
    console.error('Error rendering search page:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html' },
      body: `<h1>500 - Server Error</h1><p>${error.message}</p>`
    };
  }
};

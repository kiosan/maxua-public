// functions/timelinePage.js

const { db, runQuery, getCorsHeaders, getETagHeaders, formatDate, formatMarkdown } = require('./utils');
const { getPopularHashtags } = require('./utils/hashtags');
const templateEngine = require('./templateEngine');
const { 
  generateMetaTags, 
  generateBlogListingSchema,
  generatePersonSchema,
  extractDescription
} = require('./seo');

// Register partials
templateEngine.registerPartial('subscription-form', 'subscription-form');

/**
 * Handler for timeline page requests 
 */
exports.handler = async (event, context) => {
  try {
    // Get query parameters
    const query = event.queryStringParameters || {};
    const limit = parseInt(query.limit) || 10;
    const offset = parseInt(query.offset) || 0;
    
    
    // Fetch posts with optimized query
    let postsQuery = `
      SELECT * FROM posts p WHERE p.status = 'public'
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    
    // Add ordering and pagination
    postsQuery += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);
    
    const postsResult = await runQuery(postsQuery, queryParams);
    const posts = postsResult.rows.map(post => {
      // Format the post data for the template
      post.formatted_date = formatDate(post.created_at);
      post.content_html = formatMarkdown(post.content);
      return post;
    });
    
    // Get hashtags for all posts
    if (posts.length > 0) {
      const postIds = posts.map(post => post.id);
      
      // Fetch all hashtags for these posts in a single query
      const hashtagsResult = await runQuery(
        `SELECT ph.post_id, h.id, h.name 
         FROM hashtags h
         INNER JOIN post_hashtags ph ON h.id = ph.hashtag_id
         WHERE ph.post_id IN (${postIds.map(() => '?').join(',')})
         ORDER BY h.name ASC`,
        postIds
      );
      
      // Group hashtags by post_id
      const hashtagsByPost = {};
      for (const tag of hashtagsResult.rows) {
        if (!hashtagsByPost[tag.post_id]) {
          hashtagsByPost[tag.post_id] = [];
        }
        hashtagsByPost[tag.post_id].push({ id: tag.id, name: tag.name });
      }
      
      // Attach hashtags to each post
      for (const post of posts) {
        post.hashtags = hashtagsByPost[post.id] || [];
      }
    }
    
    // Determine if there are more posts for pagination
    let countQuery = 'SELECT COUNT(*) as count FROM posts WHERE status = \'public\'';
    const countResult = await runQuery(countQuery);
    const totalCount = parseInt(countResult.rows[0].count);
    const hasMore = offset + limit < totalCount;
    
    // Check if this is an htmx request
    const isHtmxRequest = Boolean(
      (event.headers && (
        event.headers['HX-Request'] === 'true' || 
        event.headers['hx-request'] === 'true')) ||
      event.queryStringParameters?.htmx === 'true'
    );

    if (isHtmxRequest) {
      
      const postsHtml = posts.map(post => {
        return templateEngine.render('post-card', post);
      }).join('');

      // If no more posts, add script to remove the button
      const footerHtml = !hasMore ? `
        <script>
          (function() {
            var container = document.getElementById('load-more-container');
            if (container) container.remove();
          })();
        </script>
      ` : `
        <!-- Update the load more button with the new offset -->
        <div id="load-more-button" hx-swap-oob="true">
          <button 
             hx-get="/?offset=${offset + limit}&htmx=true"
             hx-target="#posts-container"
             hx-swap="beforeend"
             class="load-more">
             Load more posts
             <span class="htmx-indicator loading-spinner"></span>
          </button>
        </div>
      `;
      
      // Return the HTMX response
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
        body: postsHtml + footerHtml
      };
    }

    const pageTitle = "Sasha Bondar personal blog";
    
    // Create a description for meta tags
    let pageDescription = 'Thoughts on startups and product. Founder of DOU.ua and Djinni.';
    
    // Construct canonical URL
    const canonicalUrl = 'https://sbondar.com';
    
    // Generate meta tags
    const metaTags = generateMetaTags({
      title: pageTitle,
      description: pageDescription,
      url: canonicalUrl,
      keywords: 'startups, tech, Sasha Bondar, Ukraine',
    });
    
    // Generate structured data
    const structuredData = [
      generateBlogListingSchema({
        url: canonicalUrl,
        title: pageTitle,
        description: pageDescription,
        posts: posts.slice(0, 10) // Include only the first 10 posts in schema
      }),
      generatePersonSchema({
        sameAs: [
          'https://www.linkedin.com/in/maksim/',
          // Add other social profiles here
        ]
      })
    ].join('\n');
    
    // Get popular hashtags for sidebar
    const popularHashtags = await getPopularHashtags(5);
    
    // Prepare template data
    const templateData = {
      posts,
      pagination: {
        offset,
        limit,
        hasMore,
        totalCount
      },
      pageTitle,
      metaTags,
      structuredData,
      popularHashtags,
      activePage: 'home'
    };
    
    // Render the page
    const html = templateEngine.render('timeline', templateData);
    
    return {
      statusCode: 200,
      headers: {
        ...getCorsHeaders(),
        //...getETagHeaders(posts),
      },
      body: html
    };
  } catch (error) {
    console.error('Error rendering timeline page:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html' },
      body: `<h1>500 - Server Error</h1><p>${error.message}</p>`
    };
  }
};

/**
 * Escape HTML special characters
 */
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Convert URLs to data attributes instead of links
 * This avoids nested anchor tags when making the whole post clickable
 */
function linkifyText(text) {
  // Instead of creating anchor tags, mark URLs with a data attribute
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, url => 
    `<span class="post-url" data-url="${url}">${url}</span>`
  );
}
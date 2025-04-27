// functions/timelinePage.js

const { pool, getCorsHeaders, getETagHeaders, formatDate } = require('./utils');
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
    
    // Extract topic slug from path or query parameters
    let topicSlug = query.topic || null;
    
    // If not in query params, try to extract from path (/t/slug)
    if (!topicSlug && event.path.startsWith('/t/')) {
      topicSlug = event.path.substring(3);
    }
    
    // Check if we need to filter by topic
    let topicId = null;
    let topic = null;
    
    if (topicSlug) {
      const topicResult = await pool.query(
        'SELECT id, name, slug, description FROM topics WHERE slug = $1',
        [topicSlug]
      );
      
      if (topicResult.rows.length > 0) {
        topic = topicResult.rows[0];
        topicId = topic.id;
      }
    }
    
    // Fetch topics for navigation
    const topicsResult = await pool.query('SELECT id, name, slug FROM topics ORDER BY name ASC');
    const topics = topicsResult.rows;
    
    // Fetch posts with optimized query
    let postsQuery = `
      SELECT 
        p.*, 
        t.name as topic_name, 
        t.slug as topic_slug,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.confirmed = true) as comment_count
      FROM posts p
      LEFT JOIN topics t ON p.topic_id = t.id
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    
    // Add topic filter if needed
    if (topicId) {
      postsQuery += ` WHERE p.topic_id = $${paramIndex++}`;
      queryParams.push(topicId);
    }
    
    // Add ordering and pagination
    postsQuery += ` ORDER BY p.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);
    
    const postsResult = await pool.query(postsQuery, queryParams);
    const posts = postsResult.rows.map(post => {
      // Format the post data for the template
      return {
        ...post,
        formatted_date: formatDate(post.created_at),
        content_html: linkifyText(escapeHTML(post.content)),
        reactions: null
      };
    });
    
    // Determine if there are more posts for pagination
    const countQuery = topicId 
    ? 'SELECT COUNT(*) FROM posts WHERE topic_id = $1'
    : 'SELECT COUNT(*) FROM posts';
    
    const countParams = topicId ? [topicId] : [];
    const countResult = await pool.query(countQuery, countParams);
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
        const showTopicBadge = post.topic_slug && 
                          (!topic || topic.id !== post.topic_id);
        
        return `
          <div class="post-card" data-post-id="${post.id}">
            <a href="/p/${post.id}" class="post-card-link">
              <div class="post-content">${post.content_html}</div>
              ${post.image_url ? `
              <div class="post-image-container">
                <img src="${post.image_url}" alt="Post image" class="post-image">
              </div>` : ''}
            </a>
            
            <div class="post-meta">
              <div class="post-date">
                <span class="post-date-text">${post.formatted_date}</span>
                <a href="#" class="translate-link" data-post-id="${post.id}" data-translated="false">Translate</a>
                ${showTopicBadge ? `
                <a href="/t/${post.topic_slug}" class="topic-badge">#${post.topic_name}</a>` : ''}
                ${post.comment_count && post.comment_count > 0 ? `
                <a href="/p/${post.id}#comments" class="comments-badge">
                  💬 ${post.comment_count}
                </a>` : ''}
              </div>
            </div>
          </div>
        `;
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
             hx-get="${topicSlug ? `/t/${topicSlug}` : '/'}?offset=${offset + limit}&htmx=true"
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

    // Set the page title based on whether we're viewing a topic or the main timeline
    const pageTitle = topic 
      ? `${topic.name}: ${topic.description} - Max Ischenko` 
      : 'Max Ischenko - Thoughts on startups, tech, and more';
    
    // Create a description for meta tags
    let pageDescription = topic
      ? `Posts about ${topic.name} from Max Ischenko - Founder of DOU.ua and Djinni.`
      : 'Thoughts on startups, tech, and Ukraine. Founder of DOU.ua and Djinni.';
    
    // Add any additional topic description if available
    if (topic && topic.description) {
      pageDescription = topic.description;
    }
    
    // Construct canonical URL
    const canonicalUrl = topic
      ? `https://maxua.com/t/${topic.slug}`
      : 'https://maxua.com';
    
    // Generate meta tags
    const metaTags = generateMetaTags({
      title: pageTitle,
      description: pageDescription,
      url: canonicalUrl,
      // Add topic name to keywords if available
      keywords: topic 
        ? `${topic.name}, startups, tech, Max Ischenko, Ukraine` 
        : 'startups, tech, Max Ischenko, Ukraine',
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
    
    // Prepare template data
    const templateData = {
      posts,
      topics,
      currentTopic: topic,
      pagination: {
        offset,
        limit,
        hasMore,
        totalCount
      },
      pageTitle,
      metaTags,
      structuredData
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

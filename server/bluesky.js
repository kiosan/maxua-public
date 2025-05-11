// functions/bluesky.js
const { BskyAgent } = require('@atproto/api');
const fetch = require('node-fetch');

/**
 * Share a blog post to Bluesky
 * 
 * @param {Object} post - The post object to share
 * @returns {Promise<Object>} - The Bluesky API response
 */
async function sharePostToBluesky(post) {
  if (!post || !post.content) {
    throw new Error('Invalid post data');
  }

  // Get Bluesky credentials from environment variables
  const BLUESKY_USERNAME = process.env.BLUESKY_USERNAME;
  const BLUESKY_PASSWORD = process.env.BLUESKY_PASSWORD;

  if (!BLUESKY_USERNAME || !BLUESKY_PASSWORD) {
    throw new Error('BLUESKY_USERNAME or BLUESKY_PASSWORD is not set');
  }
  
  try {
    // Create and authenticate the Bluesky agent
    const agent = new BskyAgent({
      service: 'https://bsky.social'
    });

    await agent.login({
      identifier: BLUESKY_USERNAME,
      password: BLUESKY_PASSWORD
    });

    // Prepare the content and URL for the post
    const content = post.content;
    
    // Create the facets for rich text features (links, mentions, etc)
    const facets = createFacets(content);
    
    // Create post record with proper rich text handling
    const postRecord = {
      text: content,
      createdAt: new Date().toISOString(),
    };

    // Add facets if we have any
    if (facets.length > 0) {
      postRecord.facets = facets;
    }

    // Extract the first URL from the content for rich embed
    const extractedUrl = extractFirstUrl(content);
    
    // If we have a URL, try to create a rich embed
    if (extractedUrl) {
      try {
        const metadata = await fetchUrlMetadata(extractedUrl);
        
        if (metadata && metadata.title) {
          // Create basic embed without image first
          const embed = {
            $type: 'app.bsky.embed.external',
            external: {
              uri: extractedUrl,
              title: metadata.title,
              description: metadata.description || ''
            }
          };
          
          // If we have an image URL, try to upload it
          if (metadata.image) {
            try {
              // Fetch the image
              const imageResponse = await fetch(metadata.image, {
                headers: { 'User-Agent': 'MaxUA-Microblog/1.0' },
                timeout: 5000
              });
              
              if (imageResponse.ok) {
                // Get the image as a buffer
                const imageBuffer = await imageResponse.buffer();
                
                // Attempt to upload the image
                const upload = await agent.uploadBlob(imageBuffer, {
                  encoding: 'image/jpeg' // Using JPEG as a safe default
                });
                
                // If upload successful, add the image to the embed
                if (upload && upload.data && upload.data.blob) {
                  embed.external.thumb = upload.data.blob;
                }
              }
            } catch (imageError) {
              console.warn('Error uploading image, continuing without thumbnail:', imageError.message);
              // Continue without the image
            }
          }
          
          // Add the embed to the post
          postRecord.embed = embed;
        }
      } catch (embedError) {
        console.warn('Failed to create rich embed:', embedError.message);
        // Continue without embed if this fails
      }
    }

    // Create the post with the rich text and embed
    const postResult = await agent.post(postRecord);
    
    return {
      success: true,
      postUri: postResult.uri
    };
  } catch (error) {
    console.error('Error sharing to Bluesky:', error);
    throw error;
  }
}

/**
 * Create facets for rich text features in Bluesky posts
 * 
 * @param {string} text - The post text to parse for links
 * @returns {Array} - Array of facet objects for the Bluesky API
 */
function createFacets(text) {
  const facets = [];
  
  // Add link facets
  const linkFacets = detectLinks(text);
  facets.push(...linkFacets);
  
  return facets;
}

/**
 * Extract the first URL from text
 *
 * @param {string} text - The text to search for a URL
 * @returns {string|null} - The first URL found or null
 */
function extractFirstUrl(text) {
  const URL_REGEX = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
  const match = text.match(URL_REGEX);
  return match ? match[0] : null;
}

/**
 * Detect links in text and create facets for them
 * 
 * @param {string} text - The text to search for links
 * @returns {Array} - Array of link facets
 */
function detectLinks(text) {
  const facets = [];
  // Improved URL regex pattern for more accurate link detection
  const URL_REGEX = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
  
  // We need to work with bytes for the facet indexes
  const textEncoder = new TextEncoder();
  
  let match;
  while ((match = URL_REGEX.exec(text)) !== null) {
    const url = match[0];
    const matchIndex = match.index;
    
    // Convert character indexes to byte indexes
    const beforeMatch = text.substring(0, matchIndex);
    const matchText = text.substring(matchIndex, matchIndex + url.length);
    
    const byteStart = textEncoder.encode(beforeMatch).length;
    const byteEnd = byteStart + textEncoder.encode(matchText).length;
    
    facets.push({
      index: {
        byteStart,
        byteEnd
      },
      features: [
        {
          $type: "app.bsky.richtext.facet#link",
          uri: url
        }
      ]
    });
  }
  
  return facets;
}

/**
 * Fetch metadata from a URL for rich embeds
 *
 * @param {string} url - The URL to fetch metadata from
 * @returns {Promise<Object|null>} - Object with title, description, and image URL
 */
async function fetchUrlMetadata(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MaxUA-Microblog/1.0'
      },
      timeout: 5000 // 5 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Extract Open Graph and basic meta tags
    const metadata = {
      title: extractMetaTag(html, 'og:title') || extractMetaTag(html, 'twitter:title') || extractTitle(html) || url,
      description: extractMetaTag(html, 'og:description') || extractMetaTag(html, 'twitter:description') || extractMetaTag(html, 'description') || '',
      image: extractMetaTag(html, 'og:image') || extractMetaTag(html, 'twitter:image') || null
    };
    
    return metadata;
  } catch (error) {
    console.warn(`Error fetching metadata for ${url}:`, error);
    return null;
  }
}

/**
 * Extract meta tag content from HTML
 *
 * @param {string} html - The HTML to parse
 * @param {string} name - The meta tag name or property
 * @returns {string|null} - The content of the meta tag or null
 */
function extractMetaTag(html, name) {
  const ogMatch = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'));
  const ogMatchReverse = html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`, 'i'));
  
  if (ogMatch && ogMatch[1]) {
    return ogMatch[1];
  } else if (ogMatchReverse && ogMatchReverse[1]) {
    return ogMatchReverse[1];
  }
  
  return null;
}

/**
 * Extract title from HTML
 *
 * @param {string} html - The HTML to parse
 * @returns {string|null} - The title tag content or null
 */
function extractTitle(html) {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : null;
}

/**
 * Create facets for rich text features in Bluesky posts
 * 
 * @param {string} text - The post text to parse for links
 * @returns {Array} - Array of facet objects for the Bluesky API
 */
function createFacets(text) {
  const facets = [];
  
  // Add link facets
  const linkFacets = detectLinks(text);
  facets.push(...linkFacets);
  
  return facets;
}

/**
 * Detect links in text and create facets for them
 * 
 * @param {string} text - The text to search for links
 * @returns {Array} - Array of link facets
 */
function detectLinks(text) {
  const facets = [];
  // Improved URL regex pattern for more accurate link detection
  const URL_REGEX = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
  
  // We need to work with bytes for the facet indexes
  const textEncoder = new TextEncoder();
  
  let match;
  while ((match = URL_REGEX.exec(text)) !== null) {
    const url = match[0];
    const matchIndex = match.index;
    
    // Convert character indexes to byte indexes
    const beforeMatch = text.substring(0, matchIndex);
    const matchText = text.substring(matchIndex, matchIndex + url.length);
    
    const byteStart = textEncoder.encode(beforeMatch).length;
    const byteEnd = byteStart + textEncoder.encode(matchText).length;
    
    facets.push({
      index: {
        byteStart,
        byteEnd
      },
      features: [
        {
          $type: "app.bsky.richtext.facet#link",
          uri: url
        }
      ]
    });
  }
  
  return facets;
}

module.exports = {
  fetchUrlMetadata,
  sharePostToBluesky
};

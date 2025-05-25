/**
 * Hashtag utilities for extracting, storing, and managing hashtags
 */

const { db, runQuery } = require('../utils');

/**
 * Extract hashtags from post content
 * @param {string} content - The post content to extract hashtags from
 * @returns {string[]} - Array of hashtags (without the # symbol)
 */
function extractHashtags(content) {
  if (!content) return [];
  
  // Regular expression to match hashtags
  // Matches any word that starts with # and contains alphanumeric characters, Ukrainian Cyrillic letters
  // The hashtag must be preceded by a space, newline, or be at the start of the content
  const hashtagRegex = /(?:^|\s)#([a-zA-Z0-9_\u0400-\u04FF\u0500-\u052F\u2DE0-\u2DFF\uA640-\uA69F]+)\b/g;
  
  const hashtags = [];
  let match;
  
  while ((match = hashtagRegex.exec(content)) !== null) {
    // Add the hashtag without the # symbol
    const hashtag = match[1].toLowerCase(); // Normalize to lowercase
    
    // Only add if not already in the array (deduplicate)
    if (!hashtags.includes(hashtag)) {
      hashtags.push(hashtag);
    }
  }
  
  return hashtags;
}

/**
 * Save hashtags for a post
 * @param {number} postId - The ID of the post
 * @param {string[]} hashtags - Array of hashtags (without the # symbol)
 * @param {boolean} manageTransaction - Whether this function should manage its own transaction
 * @returns {Promise<void>}
 */
async function savePostHashtags(postId, hashtags, manageTransaction = false) {
  if (!postId || !hashtags || hashtags.length === 0) return;
  
  try {
    // Only begin transaction if we're managing it
    if (manageTransaction) {
      db.prepare('BEGIN TRANSACTION').run();
    }
    
    // Delete existing hashtags for this post
    await runQuery('DELETE FROM post_hashtags WHERE post_id = ?', [postId]);
    
    // Process each hashtag
    for (const tag of hashtags) {
      // Find or create hashtag in the hashtags table
      let hashtagId;
      const existingTag = await runQuery(
        'SELECT id FROM hashtags WHERE name = ?',
        [tag]
      );
      
      if (existingTag.rows.length > 0) {
        // Use existing hashtag
        hashtagId = existingTag.rows[0].id;
        
        // Update post_count
        await runQuery(
          'UPDATE hashtags SET post_count = post_count + 1 WHERE id = ?',
          [hashtagId]
        );
      } else {
        // Create new hashtag
        const newTag = await runQuery(
          'INSERT INTO hashtags (name, post_count) VALUES (?, 1) RETURNING id',
          [tag]
        );
        hashtagId = newTag.rows[0].id;
      }
      
      // Create association in post_hashtags table
      await runQuery(
        'INSERT INTO post_hashtags (post_id, hashtag_id) VALUES (?, ?)',
        [postId, hashtagId]
      );
    }
    
    // Only commit transaction if we're managing it
    if (manageTransaction) {
      db.prepare('COMMIT').run();
    }
  } catch (error) {
    // Only rollback transaction if we're managing it
    if (manageTransaction) {
      db.prepare('ROLLBACK').run();
    }
    console.error('Error saving post hashtags:', error);
    throw error;
  }
}

/**
 * Get hashtags for a post
 * @param {number} postId - The ID of the post
 * @returns {Promise<Array>} - Array of hashtag objects with id and name
 */
async function getPostHashtags(postId) {
  if (!postId) return [];
  
  try {
    const result = await runQuery(
      `SELECT h.id, h.name 
       FROM hashtags h
       INNER JOIN post_hashtags ph ON h.id = ph.hashtag_id
       WHERE ph.post_id = ?
       ORDER BY h.name ASC`,
      [postId]
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error getting post hashtags:', error);
    return [];
  }
}

/**
 * Get popular hashtags
 * @param {number} limit - Number of hashtags to return
 * @returns {Promise<Array>} - Array of hashtag objects with id, name, and post_count
 */
async function getPopularHashtags(limit = 10) {
  try {
    const result = await runQuery(
      `SELECT id, name, post_count 
       FROM hashtags 
       ORDER BY post_count DESC, name ASC
       LIMIT ?`,
      [limit]
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error getting popular hashtags:', error);
    return [];
  }
}

/**
 * Recalculate post_count for all hashtags
 * This is a maintenance function that should be run periodically
 * @returns {Promise<void>}
 */
async function recalculateHashtagCounts() {
  try {
    db.prepare('BEGIN TRANSACTION').run();
    
    // Get all hashtags
    const hashtags = await runQuery('SELECT id FROM hashtags');
    
    for (const tag of hashtags.rows) {
      // Count posts for this hashtag
      const countResult = await runQuery(
        'SELECT COUNT(*) as count FROM post_hashtags WHERE hashtag_id = ?',
        [tag.id]
      );
      
      // Update count
      await runQuery(
        'UPDATE hashtags SET post_count = ? WHERE id = ?',
        [countResult.rows[0].count, tag.id]
      );
    }
    
    db.prepare('COMMIT').run();
  } catch (error) {
    db.prepare('ROLLBACK').run();
    console.error('Error recalculating hashtag counts:', error);
    throw error;
  }
}

module.exports = {
  extractHashtags,
  savePostHashtags,
  getPostHashtags,
  getPopularHashtags,
  recalculateHashtagCounts
};

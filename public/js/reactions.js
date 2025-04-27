// public/js/reactions.js
// Minimal reactions module - only includes what's actually used

// Constants
const STORAGE_KEY = 'anon_reactions';
const ANON_ID_KEY = 'microblog_anon_id';

/**
 * Get or generate anonymous ID for the current user
 * @returns {string} Anonymous user ID
 */
export function getAnonId() {
  let id = localStorage.getItem(ANON_ID_KEY);
  if (!id) {
    id = 'anon_' + Math.random().toString(36).substring(2, 12);
    localStorage.setItem(ANON_ID_KEY, id);
  }
  return id;
}

/**
 * Get user's reactions from local storage
 * @returns {Object} User reactions indexed by post ID
 */
export function getUserReactionsFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

/**
 * Save user reactions to local storage
 * @param {Object} reactions User reactions by post ID
 */
export function saveUserReactionsToStorage(reactions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reactions));
}

/**
 * Get user reactions for a specific post
 * @param {string} postId Post ID
 * @returns {Array} Emoji reactions for this post
 */
export function getUserReactionsForPost(postId) {
  const all = getUserReactionsFromStorage();
  return all[postId] || [];
}

/**
 * Add a user reaction to storage
 * @param {string} postId Post ID
 * @param {string} emoji Emoji reaction
 */
export function addUserReactionToStorage(postId, emoji) {
  const all = getUserReactionsFromStorage();
  if (!all[postId]) {
    all[postId] = [];
  }
  if (all[postId].indexOf(emoji) === -1) {
    all[postId].push(emoji);
  }
  saveUserReactionsToStorage(all);
}

/**
 * Remove a user reaction from storage
 * @param {string} postId Post ID
 * @param {string} emoji Emoji reaction
 */
export function removeUserReactionFromStorage(postId, emoji) {
  const all = getUserReactionsFromStorage();
  if (all[postId]) {
    all[postId] = all[postId].filter(e => e !== emoji);
    if (all[postId].length === 0) {
      delete all[postId];
    }
    saveUserReactionsToStorage(all);
  }
}

/**
 * Initialize reactions on the page
 * Automatically detects page type and initializes appropriately
 */
export function initReactions() {
  // Initialize static reaction toolbars (always present)
  initStaticReactionToolbars();
  
  // If we're on a single post page, load initial reactions
  if (window.location.pathname.includes('/p/')) {
    loadInitialReactions();
  }
}

/**
 * Initialize static reaction toolbars that are permanently shown
 */
function initStaticReactionToolbars() {
  const toolbars = document.querySelectorAll('.reaction-toolbar');
  
  toolbars.forEach(toolbar => {
    // Get the post ID from the toolbar's data attribute or from its parent
    const postId = toolbar.dataset.postId || toolbar.closest('.post-card')?.dataset.postId;
    
    if (!postId) {
      console.error('No post ID found for reaction toolbar');
      return;
    }
    
    // Add handlers to all reaction options
    const options = toolbar.querySelectorAll('.reaction-option');
    options.forEach(option => {
      option.addEventListener('click', () => {
        toggleReaction(postId, option.dataset.emoji);
      });
    });
    
    // Highlight user's existing reactions
    highlightUserReactions(postId, toolbar);
  });
}

/**
 * Highlight reaction options that the user has already selected
 * @param {string} postId Post ID
 * @param {HTMLElement} container The reactions container
 */
function highlightUserReactions(postId, container) {
  const userReactions = getUserReactionsForPost(postId);
  
  userReactions.forEach(emoji => {
    const option = container.querySelector(`.reaction-option[data-emoji="${emoji}"]`);
    if (option) {
      option.classList.add('user-reacted');
    }
  });
}

/**
 * Add or remove a reaction to a post
 * @param {string} postId Post ID
 * @param {string} emoji Emoji to toggle
 */
async function toggleReaction(postId, emoji) {
  try {
    const anonId = getAnonId();
    
    const res = await fetch(`/api/reactions/${postId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji, anonId })
    });

    const result = await res.json();
    
    if (!res.ok) throw new Error(result.error || 'Failed to toggle reaction');

    // Update local storage based on server response
    if (result.action === 'added') {
      addUserReactionToStorage(postId, emoji);
    } else {
      removeUserReactionFromStorage(postId, emoji);
    }

    // Update UI to reflect the change
    updateReactionsUI(postId, result.reactions || {});
    
  } catch (err) {
    console.error('Error toggling reaction:', err.message);
  }
}

/**
 * Load initial reactions for a single post page
 */
async function loadInitialReactions() {
  try {
    // Get post ID from URL
    const parts = window.location.pathname.split('/');
    const postId = parts[parts.length - 1];
    
    if (!postId) return;
    
    // Fetch reactions for this post
    const anonId = getAnonId();
    const response = await fetch(`/api/reactions/${postId}?anonId=${anonId}`);
    const data = await response.json();
    
    // Update UI with these reactions
    updateReactionsUI(postId, data.reactions || {});
  } catch (err) {
    console.error('Error loading initial reactions:', err);
  }
}

/**
 * Update the reactions UI for a post
 * @param {string} postId Post ID
 * @param {Object} reactions Updated reactions
 */
function updateReactionsUI(postId, reactions) {
  // Find all instances of this post on the page
  const postElements = document.querySelectorAll(`[data-post-id="${postId}"]`);
  
  postElements.forEach(postElement => {
    // Update reaction counts display
    const container = postElement.querySelector('.post-reactions');
    if (container) {
      // Build HTML for reactions
      let html = '';
      Object.entries(reactions).forEach(([emoji, count]) => {
        html += `<span class="reaction" data-emoji="${emoji}">${emoji} ${count}</span>`;
      });
      container.innerHTML = html;
    }
    
    // Update user-reacted state on reaction toolbar if present
    const toolbar = document.querySelector(`.reaction-toolbar[data-post-id="${postId}"]`) || 
                    document.querySelector(`.post-card[data-post-id="${postId}"] .reaction-toolbar`);
    
    if (toolbar) {
      // Reset all reaction options
      const options = toolbar.querySelectorAll('.reaction-option');
      options.forEach(option => option.classList.remove('user-reacted'));
      
      // Highlight user's reactions
      const userReactions = getUserReactionsForPost(postId);
      userReactions.forEach(emoji => {
        const option = toolbar.querySelector(`.reaction-option[data-emoji="${emoji}"]`);
        if (option) option.classList.add('user-reacted');
      });
    }
  });
}

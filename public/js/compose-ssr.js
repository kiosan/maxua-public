// public/js/compose-ssr.js
// Client-side handler for the server-rendered compose page
import { isAuthenticated } from './auth.js';

// State
let currentDraftId = null;

// DOM Elements
const contentField = document.getElementById('content');
const charCount = document.getElementById('char-count');
const charCountContainer = document.querySelector('.character-count');
const topicSelect = document.getElementById('topic');
const postButton = document.getElementById('post-button');
const saveDraftButton = document.getElementById('save-draft-button');
const statusMessage = document.getElementById('status-message');
const clearButton = document.getElementById('clear-drafts-button');
const draftsList = document.getElementById('drafts-list');

// Extract current draft ID from the URL if present
function extractDraftIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('draft');
}

/**
 * Initialize the compose page
 */
function initComposePage() {
    // Extract draft ID from URL
    currentDraftId = extractDraftIdFromUrl();
    
    // Check if user is authenticated
    if (!isAuthenticated()) {
        window.location.href = '/';
        return;
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize character count
    updateCharCount();
    
    // Auto-resize the textarea
    if (contentField) autoResizeTextarea();
}

function autoSelectLinksTopic() {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const content = contentField.value;
  // Auto-select "Links" topic if a link is detected
  if (topicSelect && urlRegex.test(content)) {
    const linksOption = Array.from(topicSelect.options).find(option => 
      option.textContent === "Links" || option.value === "1");
    topicSelect.value = linksOption.value;
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {

  // Character count & textarea resize
  if (contentField) {
    contentField.addEventListener('input', () => {
      updateCharCount();
      autoResizeTextarea();
      autoSelectLinksTopic();
    });
  }
    
    // Form submission
    const composeForm = document.getElementById('compose-form');
    if (composeForm) {
        composeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await publishPost();
        });
    }

    // Save draft button
    if (saveDraftButton) {
        saveDraftButton.addEventListener('click', async () => {
            try {
                saveDraftButton.disabled = true;
                saveDraftButton.textContent = 'Saving...';
                await saveDraft();
            } catch (err) {
                showStatus(`Error: ${err.message}`, 'error');
            } finally {
                saveDraftButton.disabled = false;
                saveDraftButton.textContent = 'Save as Draft';
            }
        });
    }
    
    // Clear all drafts button
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all drafts?')) clearAllDrafts();
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.target !== contentField && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            publishPost();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveDraftButton && saveDraftButton.click();
        }
    });
}

/**
 * Update character count display
 */
function updateCharCount() {
    if (!contentField || !charCount) return;
    const length = contentField.value.length;
    charCount.textContent = length;
    if (charCountContainer) charCountContainer.style.display = length > 250 ? 'block' : 'none';
}

/**
 * Auto-resize the textarea
 */
function autoResizeTextarea() {
    if (!contentField) return;
    contentField.style.height = 'auto';
    contentField.style.height = contentField.scrollHeight + 'px';
}

/**
 * Publish a post
 */
async function publishPost() {
    if (!contentField || !postButton) return;
    const content = contentField.value.trim();
    if (!content) return showStatus('Post content cannot be empty', 'error');

    const topicId = topicSelect.value !== 'none' ? topicSelect.value : null;
    const shareTelegram = document.getElementById('share-telegram').checked;
    const shareBluesky = document.getElementById('share-bluesky').checked;
    const shareEmail = true;

    postButton.disabled = true;
    postButton.textContent = 'Publishing...';

    try {
        const data = { 
            content,
            topic_id: topicId,
            share_options: { telegram: shareTelegram, bluesky: shareBluesky, email: shareEmail }
        };

        const res = await fetch('/api/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to create post');

        if (currentDraftId) await deleteDraft(currentDraftId);

        let successMessage = 'Post published successfully!';
        if (shareTelegram || shareBluesky) {
            successMessage += ' Shared to: ' +
              [shareTelegram && 'Telegram', shareBluesky && 'Bluesky'].filter(Boolean).join(' and ');
        }
        showStatus(successMessage, 'success');

        contentField.value = '';
        const prev = document.getElementById('fs-preview'); if (prev) prev.remove();
        updateCharCount();
        autoResizeTextarea();

        setTimeout(() => window.location.href = '/', 1500);
    } catch (err) {
        console.error('Error publishing post:', err);
        showStatus(`Error: ${err.message}`, 'error');
    } finally {
        postButton.disabled = false;
        postButton.textContent = 'Publish';
    }
}

/**
 * Save the current draft
 */
async function saveDraft() {
    const content = contentField.value.trim();
    if (!content) throw new Error('Cannot save empty draft');

    const topicId = topicSelect.value !== 'none' ? topicSelect.value : null;
    const shareTelegram = document.getElementById('share-telegram').checked;
    const shareBluesky = document.getElementById('share-bluesky').checked;

    const data = {
        content,
        topic_id: topicId,
        share_telegram: shareTelegram,
        share_bluesky: shareBluesky
    };

    let apiUrl, method;
    if (currentDraftId) {
        apiUrl = `/api/drafts/${currentDraftId}`;
        method = 'PUT';
    } else {
        apiUrl = '/api/drafts';
        method = 'POST';
    }

    const res = await fetch(apiUrl, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save draft');
    }

    const draft = await res.json();
    currentDraftId = draft.id;
    const urlObj = new URL(window.location);
    urlObj.searchParams.set('draft', currentDraftId);
    window.history.pushState({}, '', urlObj);
    showStatus('Draft saved successfully', 'success');
    setTimeout(() => window.location.href = `/compose?draft=${currentDraftId}`, 500);
    return draft;
}

/**
 * Load a draft
 */
window.loadDraft = function(draftId) {
    window.location.href = `/compose?draft=${draftId}`;
};

/**
 * Delete a draft by ID
 */
async function deleteDraft(draftId) {
    try {
        const res = await fetch(`/api/drafts/${draftId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to delete draft');
        if (currentDraftId === draftId) {
            currentDraftId = null;
            const urlObj = new URL(window.location); urlObj.searchParams.delete('draft'); window.history.pushState({}, '', urlObj);
        }
        window.location.href = '/compose';
        return true;
    } catch (err) {
        console.error('Error deleting draft:', err);
        showStatus(`Error: ${err.message}`, 'error');
        return false;
    }
}

/**
 * Clear all drafts
 */
async function clearAllDrafts() {
    try {
        const res = await fetch('/api/drafts?all=true', { method: 'DELETE', credentials: 'include' });
        if (!res.ok) throw new Error('Failed to clear drafts');
        window.location.href = '/compose';
    } catch (err) {
        console.error('Error clearing drafts:', err);
        showStatus(`Error: ${err.message}`, 'error');
    }
}

/**
 * Show status message
 */
function showStatus(message, type = 'success') {
    if (!statusMessage) return;
    statusMessage.textContent = message;
    statusMessage.className = `status-message status-${type}`;
    statusMessage.style.display = 'block';
    if (type === 'success') setTimeout(() => statusMessage.style.display = 'none', 3000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initComposePage);


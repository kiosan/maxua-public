// public/js/comments.js 
import { getAnonId } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  const commentForm = document.getElementById('comment-form');
  const commentContent = document.getElementById('comment-content');
  const commentsContainer = document.getElementById('comments-container');
  const commenterFields = document.getElementById('commenter-fields');
  const verifiedInfo = document.getElementById('verified-commenter-info');
  
  // Get user identification details from localStorage
  const isVerified = localStorage.getItem('comment_verified') === 'true';
  const savedName = localStorage.getItem('comment_name');
  const savedEmail = localStorage.getItem('comment_email');
  const anonId = getAnonId();

  // Show verification badge if user is known
  if (isVerified && savedName) {
    if (verifiedInfo) {
      verifiedInfo.innerHTML = `<div class="verified-commenter-note">Commenting as ${savedName} (verified)</div>`;
      verifiedInfo.style.display = 'block';
    }
      // Remove the required attribute from the name/email fields
      const nameInput = document.getElementById('comment-name');
      const emailInput = document.getElementById('comment-email');
      if (nameInput) nameInput.removeAttribute('required');
      if (emailInput) emailInput.removeAttribute('required');
  } else {
    // For unverified users, show fields only when they start typing
    if (commentContent) {
      commentContent.addEventListener('input', showCommenterFieldsIfNeeded);
    }
  }

  // Function to show commenter fields when user begins typing
  function showCommenterFieldsIfNeeded() {
    if (!isVerified && commentContent.value.trim().length > 0 && commenterFields) {
      // User has started typing and is not verified, show the name/email fields
      commenterFields.style.display = 'block';
      
      // Pre-populate fields if we have them saved
      const nameInput = document.getElementById('comment-name');
      const emailInput = document.getElementById('comment-email');
      
      if (nameInput && savedName) {
        nameInput.value = savedName;
      }
      
      if (emailInput && savedEmail) {
        emailInput.value = savedEmail;
      }
      
      // Remove this listener since we only need to trigger once
      commentContent.removeEventListener('input', showCommenterFieldsIfNeeded);
    }
  }

  // Handle comment form submission
  commentForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const content = commentContent.value.trim();
    if (!content) return;
    
    // Get Submit Button
    const submitButton = commentForm.querySelector('button[type="submit"]');
    
    // Set button to loading state
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Posting...';
      submitButton._originalText = 'Post Comment';
    }
    
    try {
      // For verified users, use saved info
      if (isVerified && savedName) {
        await submitComment({
          author: savedName,
          email: savedEmail || '',
          content
        });
        
        resetForm();
        return;
      }
      
      // For new users, get info from the form fields
      const nameInput = document.getElementById('comment-name');
      const emailInput = document.getElementById('comment-email');
      
      if (!nameInput || !nameInput.value.trim()) {
        alert('Please enter your name');
        restoreButton();
        return;
      }
      
      const name = nameInput.value.trim();
      const email = emailInput ? emailInput.value.trim() : '';
      
      const result = await submitComment({
        author: name,
        email,
        content
      });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // If we got here, save in localStorage
      localStorage.setItem('comment_verified', 'true');
      localStorage.setItem('comment_name', name);
      if (email) localStorage.setItem('comment_email', email);
      
      // Reset the form
      resetForm();
      
      // Show the comment immediately
      showPendingComment(name, content);
      
      // Show success message
      showFormFeedback('Comment submitted! It will appear after approval.', 'success');
    } catch (error) {
      showFormFeedback(`Error: ${error.message}`, 'error');
      console.error('Error submitting comment:', error);
      restoreButton();
    }
  });

  function resetForm() {
    commentForm.reset();
    
    // Restore button state
    restoreButton();
    
    // If commenter fields were showing, hide them again for clean state
    if (commenterFields && !isVerified) {
      commenterFields.style.display = 'none';
      
      // Re-add the listener for next time
      if (commentContent) {
        commentContent.addEventListener('input', showCommenterFieldsIfNeeded);
      }
    }
  }

  function restoreButton() {
    const submitButton = commentForm?.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = submitButton._originalText || 'Post Comment';
    }
  }

  function showFormFeedback(message, type = 'success') {
    // Check if feedback element already exists
    let feedback = document.querySelector('.comment-form-feedback');
    
    if (!feedback) {
      feedback = document.createElement('div');
      feedback.className = 'comment-form-feedback';
      feedback.style.marginTop = '10px';
      feedback.style.padding = '10px';
      feedback.style.borderRadius = '4px';
      feedback.style.fontFamily = 'inherit';
      feedback.style.fontSize = '0.9rem';
      
      if (commentForm) {
        commentForm.appendChild(feedback);
      }
    }
    
    // Set style based on type
    if (type === 'success') {
      feedback.style.backgroundColor = '#e6f7e6';
      feedback.style.color = '#2e7d32';
      feedback.style.border = '1px solid #c3e6cb';
    } else {
      feedback.style.backgroundColor = '#ffebee';
      feedback.style.color = '#c62828';
      feedback.style.border = '1px solid #ffcdd2';
    }
    
    feedback.textContent = message;
    
    // Make it disappear after a delay
    setTimeout(() => {
      feedback.style.opacity = '0';
      feedback.style.transition = 'opacity 0.5s ease';
      
      setTimeout(() => {
        if (feedback.parentNode) {
          feedback.parentNode.removeChild(feedback);
        }
      }, 500);
    }, 4000);
  }

  async function submitComment({ author, email, content }) {
    try {
      const postCard = document.querySelector('.post-card');
      const postId = postCard?.dataset.postId;
      if (!postId) throw new Error('Post ID not found');
      
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, author, email, content, anonId })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to post comment');
      }
      
      const result = await res.json();
      
      if (!result.confirmed) {
        // Comment is pending - but we show it with pending status
        showFormFeedback('Comment submitted for review');
      } else {
        // Comment was auto-approved
        await loadComments(postId);
      }
      
      return result;
    } catch (error) {
      console.error('Error submitting comment:', error);
      throw error; // Let the calling function handle this
    }
  }

  function showPendingComment(author, content) {
    // First, make sure the comments list is visible
    const commentsWrapper = document.getElementById('existing-comments');
    if (commentsWrapper) commentsWrapper.style.display = '';

    // Update the heading if needed
    const heading = document.getElementById('add-comment-heading');
    if (heading) heading.textContent = 'Add your comment';

    // Create and add the pending comment with a subtle style
    const container = document.querySelector('.comments-list');
    
    // Create the pending comment element
    const pendingEl = document.createElement('div');
    pendingEl.className = 'comment-card';
    pendingEl.style.borderLeft = '3px solid #1a73e8'; // Use accent color for border
    pendingEl.style.backgroundColor = '#f8f9fa'; // Light background

    pendingEl.innerHTML = `
      <div class="comment-meta">
        <div class="comment-author">${escapeHTML(author)}</div>
        <div class="comment-date">Just now</div>
      </div>
      <div class="comment-content">${escapeHTML(content)}</div>
    `;

    // Add to the beginning of the comment list
    if (container) {
      if (container.firstChild) {
        container.insertBefore(pendingEl, container.firstChild);
      } else {
        container.appendChild(pendingEl);
      }
    }

    // Update the comment count
    const countDisplay = document.querySelector('.comments-count');
    if (countDisplay) {
      const currentCount = parseInt(countDisplay.textContent.match(/\d+/) || '0');
      countDisplay.textContent = `Comments (${currentCount + 1})`;
    } else if (commentsWrapper) {
      // If there was no count display, create one
      const commentsHeading = document.createElement('h2');
      commentsHeading.className = 'comments-heading comments-count';
      commentsHeading.textContent = 'Comments (1)';
      
      if (commentsWrapper.firstChild) {
        commentsWrapper.insertBefore(commentsHeading, commentsWrapper.firstChild);
      }
    }

    // Scroll to the pending comment
    pendingEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function loadComments(postId) {
    try {
      const res = await fetch(`/api/comments?postId=${encodeURIComponent(postId)}`);
      if (!res.ok) throw new Error('Failed to load comments');
      
      const comments = await res.json();

      const container = document.querySelector('.comments-list');
      const countDisplay = document.querySelector('.comments-count');
      const commentsWrapper = document.getElementById('existing-comments');
      const heading = document.getElementById('add-comment-heading');

      if (!container) return;
      
      // Clear existing comments
      container.innerHTML = '';
      
      if (comments.length === 0) {
        if (commentsWrapper) commentsWrapper.style.display = 'none';
        if (heading) heading.textContent = '💬 Be the first to leave a comment';
        return;
      }

      if (commentsWrapper) commentsWrapper.style.display = '';
      if (heading) heading.textContent = 'Add your comment';

      comments.forEach(c => {
        const el = document.createElement('div');
        el.className = 'comment-card';
        el.innerHTML = `
          <div class="comment-meta">
            <div class="comment-author">${escapeHTML(c.author)}</div>
            <div class="comment-date">${new Date(c.created_at).toLocaleString()}</div>
          </div>
          <div class="comment-content">${escapeHTML(c.content)}</div>
        `;

        // Add author reply if present
        if (c.author_reply) {
          const replyEl = document.createElement('div');
          replyEl.className = 'author-reply';
          replyEl.innerHTML = `
            <div class="author-reply-content">↳ ${escapeHTML(c.author_reply)}</div>
          `;
          el.appendChild(replyEl);
        }
        
        container.appendChild(el);
      });
      
      if (countDisplay) {
        countDisplay.textContent = "What others are saying";
      } else if (commentsWrapper && comments.length > 0) {
        // If there was no count display, create one
        const commentsHeading = document.createElement('h2');
        commentsHeading.className = 'comments-heading comments-count';
        countDisplay.textContent = "What others are saying";
        
        if (commentsWrapper.firstChild) {
          commentsWrapper.insertBefore(commentsHeading, commentsWrapper.firstChild);
        }
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Load initial comments and set up the form
  const postCard = document.querySelector('.post-card');
  if (postCard?.dataset.postId) {
    loadComments(postCard.dataset.postId);
  }
});

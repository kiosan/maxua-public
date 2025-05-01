// public/js/subscription.js
// Handle subscription form submission

/**
 * Initialize the subscription form
 */
function initSubscriptionForm() {
  const form = document.getElementById('subscription-form');
  const emailInput = document.getElementById('subscriber-email');
  const subscribeButton = document.getElementById('subscribe-button');
  const messageEl = document.getElementById('subscription-message');
  
  if (!form || !emailInput || !subscribeButton || !messageEl) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Validate email
    const email = emailInput.value.trim();
    if (!email || !isValidEmail(email)) {
      showMessage('Please enter a valid email address.', 'error');
      return;
    }

    // Get selected preference
    const preferences = document.querySelector('input[name="preferences"]:checked').value;
    
    // Disable button and show loading state
    subscribeButton.disabled = true;
    subscribeButton.textContent = 'Subscribing...';
    
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, preferences })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        showMessage(result.message, 'success');
        emailInput.value = ''; // Clear the form
      } else {
        throw new Error(result.error || 'Failed to subscribe');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      // Re-enable button
      subscribeButton.disabled = false;
      subscribeButton.textContent = 'Subscribe';
    }
  });
  
  // Add input validation
  emailInput.addEventListener('input', () => {
    const email = emailInput.value.trim();
    if (email && !isValidEmail(email)) {
      emailInput.setCustomValidity('Please enter a valid email address');
    } else {
      emailInput.setCustomValidity('');
    }
  });
}

/**
 * Show a status message
 * @param {string} message - Message to display
 * @param {string} type - 'success' or 'error'
 */
function showMessage(message, type = 'success') {
  const messageEl = document.getElementById('subscription-message');
  if (!messageEl) return;
  
  messageEl.textContent = message;
  messageEl.className = `subscription-message ${type}`;
  
  // Hide after a delay for success messages
  if (type === 'success') {
    setTimeout(() => {
      messageEl.style.display = 'none';
    }, 8000);
  }
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - Whether the email is valid
 */
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', initSubscriptionForm);

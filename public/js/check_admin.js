// public/js/check_admin.js
import { isAuthenticated, verifyAuthWithServer, enableDevBypass } from './auth_cookie.js';

document.addEventListener('DOMContentLoaded', () => {
  // Enable dev bypass for local development
  if (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1') {
    enableDevBypass();
  }
  
  // Get admin links elements
  const composeLink = document.getElementById('compose-link');
  const adminLink = document.getElementById('admin-link');
  
  // Quick check first - immediately show/hide based on localStorage
  if (isAuthenticated()) {
    if (composeLink) composeLink.style.display = 'inline-block';
    if (adminLink) adminLink.style.display = 'inline-block';
  } else {
    if (composeLink) composeLink.style.display = 'none';
    if (adminLink) adminLink.style.display = 'none';
  }
  
  // Then verify with server in the background
  verifyAuthWithServer().then(isAuth => {
    // Update UI if server response differs from localStorage
    if (isAuth !== isAuthenticated()) {
      if (isAuth) {
        if (composeLink) composeLink.style.display = 'inline-block';
        if (adminLink) adminLink.style.display = 'inline-block';
      } else {
        if (composeLink) composeLink.style.display = 'none';
        if (adminLink) adminLink.style.display = 'none';
      }
    }
  }).catch(err => {
    console.error('Auth verification error:', err);
  });
});

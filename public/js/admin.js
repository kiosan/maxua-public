// public/js/admin.js
import {
  isDevBypassEnabled,
  saveSession,
  loadSession,
  clearSession,
  isSessionValid,
  login,
  logout
} from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
  const passwordInput = document.getElementById('password-input');
  const loginButton = document.getElementById('login-button');
  const logoutButton = document.getElementById('logout-button');
  const revokeButton = document.getElementById('revoke-button');
  const loginStatus = document.getElementById('login-status');
  const sessionStatus = document.getElementById('session-status');
  const settingsStatus = document.getElementById('settings-status');
  const adminPanel = document.getElementById('admin-panel');
  const loginSection = document.getElementById('login-section');
  const sessionInfo = document.getElementById('session-info');
  const siteTitle = document.getElementById('site-title');

  checkAuth();

  if (passwordInput) {
    passwordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (loginButton) loginButton.click();
      }
    });
  }

  if (loginButton) {
    loginButton.addEventListener('click', async () => {
      const password = passwordInput.value.trim();
      if (!password) return showError(loginStatus, 'Enter your password');

      loginButton.disabled = true;
      loginButton.textContent = 'Verifying...';

      try {
        // Use the new login function that handles both cookie and localStorage
        const result = await login(password, navigator.userAgent);
        
        if (result.success) {
          showSuccess(loginStatus, 'Login successful!');
          showAdminPanel();
        } else {
          throw new Error(result.error || 'Login failed');
        }
      } catch (e) {
        showError(loginStatus, e.message);
        passwordInput.value = '';
      } finally {
        loginButton.disabled = false;
        loginButton.textContent = 'Login';
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      try {
        // Just clear local session - for full logout with cookie clearing,
        // we would use the logout function with password
        clearSession();
        
        showSuccess(sessionStatus, 'Logged out');
        if (loginSection) loginSection.style.display = 'block';
        if (adminPanel) adminPanel.style.display = 'none';
      } catch (error) {
        showError(sessionStatus, 'Error logging out: ' + error.message);
      }
    });
  }

  if (revokeButton) {
    revokeButton.addEventListener('click', async () => {
      const password = passwordInput.value.trim();
      if (!password) return showError(sessionStatus, 'Enter your password');

      if (!confirm('Revoke all sessions?')) return;

      revokeButton.disabled = true;
      revokeButton.textContent = 'Revoking...';

      try {
        // Use the logout function with password to clear all sessions
        const result = await logout(password);
        
        if (result.success) {
          showSuccess(sessionStatus, 'Sessions revoked');
          if (loginSection) loginSection.style.display = 'block';
          if (adminPanel) adminPanel.style.display = 'none';
          passwordInput.value = '';
        } else {
          throw new Error(result.error || 'Failed to revoke');
        }
      } catch (e) {
        showError(sessionStatus, e.message);
      } finally {
        revokeButton.disabled = false;
        revokeButton.textContent = 'Revoke All Sessions';
      }
    });
  }

  const saveButton = document.getElementById('save-settings');
  if (saveButton) {
    saveButton.addEventListener('click', () => {
      const newTitle = siteTitle.value.trim();
      if (!newTitle) return showError(settingsStatus, 'Enter a title');

      localStorage.setItem('microblog_settings', JSON.stringify({ siteTitle: newTitle }));
      showSuccess(settingsStatus, 'Saved!');
    });
  }

  async function checkAuth() {
    if (isDevBypassEnabled()) {
      showAdminPanel();
      return;
    }

    const session = loadSession();
    if (session && session.sessionId) {
      // Check with server - this now uses cookies primarily
      // but falls back to session ID for backward compatibility
      const isValid = await isSessionValid(session.sessionId);
      
      if (isValid) {
        showAdminPanel();
        return;
      }
    }
    
    if (loginSection) loginSection.style.display = 'block';
    if (adminPanel) adminPanel.style.display = 'none';
  }

  function showAdminPanel() {
    if (loginSection) loginSection.style.display = 'none';
    if (adminPanel) adminPanel.style.display = 'block';

    const session = loadSession();
    if (session && sessionInfo) {
      const expires = new Date(session.expires);
      sessionInfo.innerHTML = `
        <p><strong>Session ID:</strong> ${session.sessionId}</p>
        <p><strong>Expires:</strong> ${expires.toLocaleString()}</p>
        <p><small>Using secure cookie authentication</small></p>
      `;
    }

    const settings = localStorage.getItem('microblog_settings');
    if (settings && siteTitle) {
      try {
        const parsed = JSON.parse(settings);
        if (parsed.siteTitle) siteTitle.value = parsed.siteTitle;
      } catch {}
    }
  }

  function showError(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.className = 'status error';
    el.style.display = 'block';
    setTimeout(() => (el.style.display = 'none'), 5000);
  }

  function showSuccess(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.className = 'status success';
    el.style.display = 'block';
    setTimeout(() => (el.style.display = 'none'), 5000);
  }
});

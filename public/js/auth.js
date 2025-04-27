// public/js/auth.js
// Consolidated auth: Primary cookie-based with localStorage compatibility

const AUTH_KEY = 'microblog_auth';  // Keep the same key for backward compatibility
const DEV_BYPASS_KEY = 'microblog_dev_bypass';

/**
 * Check if user is authenticated using localStorage (for compatibility)
 */
export function isAuthenticated() {
  const authData = loadSession();
  return authData && authData.authorized;
}

/**
 * Check if dev bypass is enabled (for local testing)
 */
export function isDevBypassEnabled() {
  return (
    (window.location.hostname === 'localhost' ||
     window.location.hostname === '127.0.0.1') &&
    localStorage.getItem(DEV_BYPASS_KEY) === 'true'
  );
}

/**
 * Enable dev bypass for local development
 */
export function enableDevBypass() {
  localStorage.setItem(DEV_BYPASS_KEY, 'true');
  saveSession({ authorized: true, sessionId: 'dev-bypass' });
}

/**
 * Save authentication data to localStorage for compatibility
 */
export function saveSession(data) {
  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({
      authorized: true,
      sessionId: data.sessionId,
      expires: data.expiresAt
    })
  );
}

/**
 * Load authentication data from localStorage
 */
export function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY));
  } catch (e) {
    return null;
  }
}

/**
 * Clear authentication data from localStorage
 */
export function clearSession() {
  localStorage.removeItem(AUTH_KEY);
}

/**
 * Verify session with server to check if it's valid
 * This is the core function that now uses cookies
 */
export async function isSessionValid(sessionId) {
  try {
    const res = await fetch(`/api/auth`, {
      method: 'GET',
      credentials: 'include' // Important: send cookies with request
    });
    const json = await res.json();
    
    // Update localStorage to match server status (for compatibility)
    if (json.valid !== isAuthenticated()) {
      if (json.valid) {
        // If server says valid but localStorage says not valid,
        // update localStorage to match server
        saveSession({ 
          sessionId: sessionId || 'cookie-auth', 
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
        });
      } else {
        // If server says not valid but localStorage says valid,
        // clear localStorage to match server
        clearSession();
      }
    }
    
    return res.ok && json.valid;
  } catch (err) {
    console.error("Error checking session:", err);
    return false;
  }
}

/**
 * Perform login action - sends request to server
 * Server will set HttpOnly cookie, and we update localStorage for compatibility
 */
export async function login(password, deviceInfo) {
  const response = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',  // Important: send/receive cookies
    body: JSON.stringify({ password, deviceInfo })
  });

  const result = await response.json();
  
  if (response.ok && result.success) {
    // Save session info in localStorage for compatibility with existing code
    saveSession({ 
      sessionId: result.sessionId || 'cookie-auth', 
      expiresAt: result.expiresAt 
    });
    return { success: true };
  } else {
    throw new Error(result.error || 'Login failed');
  }
}

/**
 * Perform logout action - clears auth from localStorage and sends logout request
 * to server to clear the cookie
 */
export async function logout(password) {
  // Always clear localStorage data
  clearSession();
  
  if (password) {
    try {
      // If password provided, attempt to clear all sessions on the server
      const response = await fetch('/api/auth', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password })
      });
      
      const result = await response.json();
      return { success: response.ok && result.success };
    } catch (error) {
      console.error('Error in logout:', error);
      return { success: false, error: error.message };
    }
  } else {
    // Without password, we can only clear localStorage, not server sessions
    // To properly implement cookie clearing without password, we'd need a dedicated logout endpoint
    return { success: true, localOnly: true };
  }
}

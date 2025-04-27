// public/js/logger.js
const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export { isDev }; // named export

export function log(...args) {
  if (isDev) console.log('[dev]', ...args);
}

export function warn(...args) {
  if (isDev) console.warn('[dev]', ...args);
}

export function error(...args) {
  if (isDev) console.error('[dev]', ...args);
}


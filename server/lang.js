/**
 * Site language (en | uk) for the personal pages: home and the /variety landing.
 *
 * URL scheme: English lives at the bare path (/, /variety), Ukrainian under /uk
 * (/uk, /uk/variety). A visitor who opens an English URL is redirected to the
 * Ukrainian one when their browser prefers Ukrainian and they have not chosen a
 * language explicitly. An explicit choice (the UA/EN switcher) is stored in the
 * `lang` cookie and always wins over the browser. Anything else — no header, a
 * bot, an unknown language — gets English.
 */

const express = require('express');

const SUPPORTED = ['en', 'uk'];
const DEFAULT_LANG = 'en';
const COOKIE_NAME = 'lang';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000; // one year

/**
 * Pick the best supported language from an Accept-Language header.
 * @param {string|undefined} header
 * @returns {string} 'en' | 'uk'
 */
function fromAcceptLanguage(header) {
  if (!header) return DEFAULT_LANG;
  const ranked = header
    .split(',')
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith('q='));
      const weight = q ? parseFloat(q.slice(2)) : 1;
      return { primary: tag.toLowerCase().split('-')[0], weight: Number.isNaN(weight) ? 0 : weight, index };
    })
    .filter((item) => item.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  const match = ranked.find((item) => SUPPORTED.includes(item.primary));
  return match ? match.primary : DEFAULT_LANG;
}

/**
 * The language the visitor wants: explicit cookie first, browser second, English last.
 * @param {import('express').Request} req
 * @returns {string}
 */
function preferredLang(req) {
  const cookie = req.cookies && req.cookies[COOKIE_NAME];
  if (SUPPORTED.includes(cookie)) return cookie;
  return fromAcceptLanguage(req.headers['accept-language']);
}

/**
 * Path of a page in a given language.
 * @param {string} lang
 * @param {string} path English path ('/', '/variety')
 * @returns {string}
 */
function localizedPath(lang, path) {
  if (lang === 'uk') return path === '/' ? '/uk' : `/uk${path}`;
  return path;
}

/**
 * Middleware for English URLs: send visitors who prefer Ukrainian to the /uk twin.
 * @param {string} path English path the route serves
 */
function redirectToPreferred(path) {
  return (req, res, next) => {
    res.set('Vary', 'Accept-Language, Cookie');
    const lang = preferredLang(req);
    if (lang !== DEFAULT_LANG) {
      return res.redirect(302, localizedPath(lang, path));
    }
    return next();
  };
}

/**
 * Sanitise a `next` redirect target: same-origin absolute paths only.
 * @param {unknown} next
 * @returns {string}
 */
function safeNext(next) {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return '/';
  }
  return next;
}

const router = express.Router();

// The UA/EN switcher: remember the choice, then go where the link pointed.
router.get('/lang/:code', (req, res) => {
  const code = String(req.params.code).toLowerCase();
  if (!SUPPORTED.includes(code)) {
    return res.status(404).send('Unknown language');
  }
  res.cookie(COOKIE_NAME, code, {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: false,
    sameSite: 'lax',
    path: '/'
  });
  return res.redirect(302, safeNext(req.query.next));
});

module.exports = {
  SUPPORTED,
  DEFAULT_LANG,
  fromAcceptLanguage,
  preferredLang,
  localizedPath,
  redirectToPreferred,
  router
};

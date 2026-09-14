/**
 * Route for the landing page — simple personal home, in English (/) and Ukrainian (/uk).
 */

const express = require('express');
const router = express.Router();
const templateEngine = require('../templateEngine');
const { generateMetaTags, generatePersonSchema } = require('../seo');
const locales = require('../locales/site');
const { redirectToPreferred, localizedPath, SUPPORTED } = require('../lang');

const DOMAIN = 'https://sbondar.com';

/**
 * Render the home page in one language.
 * @param {string} lang 'en' | 'uk'
 */
function renderHome(lang, req, res) {
  try {
    const t = locales[lang];
    const alternates = SUPPORTED.map((code) => ({ code, url: `${DOMAIN}${localizedPath(code, '/')}` }));

    const metaTags = generateMetaTags({
      title: t.home.title,
      description: t.home.description,
      url: `${DOMAIN}${localizedPath(lang, '/')}`,
      type: 'website',
      keywords: t.home.keywords,
      locale: t.ogLocale,
      alternates: alternates.map((a) => ({ lang: a.code, url: a.url }))
    });

    const structuredData = generatePersonSchema({
      sameAs: ['https://www.linkedin.com/in/obondar/']
    });

    const html = templateEngine.render('home', {
      pageTitle: t.home.title,
      metaTags,
      structuredData,
      activePage: 'home',
      lang,
      isUk: lang === 'uk',
      t,
      switchTo: {
        uk: `/lang/uk?next=${encodeURIComponent(localizedPath('uk', '/'))}`,
        en: `/lang/en?next=${encodeURIComponent(localizedPath('en', '/'))}`
      },
      varietyHref: localizedPath(lang, '/variety')
    });

    res.send(html);
  } catch (error) {
    console.error('Error rendering home page:', error);
    res.status(500).send(`<h1>500 - Server Error</h1><p>${error.message}</p>`);
  }
}

router.get('/', redirectToPreferred('/'), (req, res) => renderHome('en', req, res));
router.get('/uk', (req, res) => renderHome('uk', req, res));

module.exports = router;

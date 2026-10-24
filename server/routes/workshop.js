/**
 * Route for the AI Workshop landing — /workshop (English) and /uk/workshop (Ukrainian).
 */

const express = require('express');
const router = express.Router();
const templateEngine = require('../templateEngine');
const { generateMetaTags, generateBreadcrumbsSchema, generatePersonSchema } = require('../seo');
const locales = require('../locales/site');
const { redirectToPreferred, localizedPath, SUPPORTED } = require('../lang');

const DOMAIN = 'https://sbondar.com';

/**
 * Render the workshop landing in one language.
 * @param {string} lang 'en' | 'uk'
 */
function renderWorkshop(lang, req, res) {
  try {
    const t = locales[lang];
    const path = localizedPath(lang, '/workshop');
    const url = `${DOMAIN}${path}`;

    const metaTags = generateMetaTags({
      title: t.workshop.title,
      description: t.workshop.description,
      url,
      type: 'website',
      keywords: t.workshop.keywords,
      locale: t.ogLocale,
      alternates: SUPPORTED.map((code) => ({ lang: code, url: `${DOMAIN}${localizedPath(code, '/workshop')}` }))
    });

    const structuredData = [
      generateBreadcrumbsSchema([
        { name: t.workshop.breadcrumbHome, url: localizedPath(lang, '/') },
        { name: t.workshop.breadcrumbPage, url: path }
      ], DOMAIN),
      generatePersonSchema({
        sameAs: ['https://www.linkedin.com/in/obondar/']
      })
    ].join('\n');

    const html = templateEngine.render('workshop', {
      pageTitle: t.workshop.title,
      metaTags,
      structuredData,
      activePage: 'workshop',
      lang,
      isUk: lang === 'uk',
      t,
      homeHref: localizedPath(lang, '/'),
      switchTo: {
        uk: `/lang/uk?next=${encodeURIComponent(localizedPath('uk', '/workshop'))}`,
        en: `/lang/en?next=${encodeURIComponent(localizedPath('en', '/workshop'))}`
      }
    });

    res.send(html);
  } catch (error) {
    console.error('Error rendering /workshop page:', error);
    res.status(500).send(`<h1>500 - Server Error</h1><p>${error.message}</p>`);
  }
}

router.get('/workshop', redirectToPreferred('/workshop'), (req, res) => renderWorkshop('en', req, res));
router.get('/uk/workshop', (req, res) => renderWorkshop('uk', req, res));

module.exports = router;

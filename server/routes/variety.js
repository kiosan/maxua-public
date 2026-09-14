/**
 * Route for the /variety page — promo page for the "Requisite Variety" book,
 * in English (/variety) and Ukrainian (/uk/variety).
 */

const express = require('express');
const router = express.Router();
const templateEngine = require('../templateEngine');
const { generateMetaTags, generateBreadcrumbsSchema, generatePersonSchema } = require('../seo');
const locales = require('../locales/site');
const { redirectToPreferred, localizedPath, SUPPORTED } = require('../lang');

const DOMAIN = 'https://sbondar.com';

/**
 * Render the book promo page in one language.
 * @param {string} lang 'en' | 'uk'
 */
function renderVariety(lang, req, res) {
  try {
    const t = locales[lang];
    const path = localizedPath(lang, '/variety');
    const url = `${DOMAIN}${path}`;

    const metaTags = generateMetaTags({
      title: t.variety.title,
      description: t.variety.description,
      url,
      type: 'article',
      image: `${DOMAIN}${t.variety.ogImage}`,
      keywords: t.variety.keywords,
      locale: t.ogLocale,
      alternates: SUPPORTED.map((code) => ({ lang: code, url: `${DOMAIN}${localizedPath(code, '/variety')}` }))
    });

    const structuredData = [
      generateBreadcrumbsSchema([
        { name: t.variety.breadcrumbHome, url: localizedPath(lang, '/') },
        { name: t.variety.breadcrumbBook, url: path }
      ], DOMAIN),
      generatePersonSchema({
        sameAs: ['https://www.linkedin.com/in/obondar/']
      })
    ].join('\n');

    const html = templateEngine.render('variety', {
      pageTitle: t.variety.title,
      metaTags,
      structuredData,
      activePage: 'variety',
      lang,
      isUk: lang === 'uk',
      t,
      homeHref: localizedPath(lang, '/'),
      switchTo: {
        uk: `/lang/uk?next=${encodeURIComponent(localizedPath('uk', '/variety'))}`,
        en: `/lang/en?next=${encodeURIComponent(localizedPath('en', '/variety'))}`
      }
    });

    res.send(html);
  } catch (error) {
    console.error('Error rendering /variety page:', error);
    res.status(500).send(`<h1>500 - Server Error</h1><p>${error.message}</p>`);
  }
}

router.get('/variety', redirectToPreferred('/variety'), (req, res) => renderVariety('en', req, res));
router.get('/uk/variety', (req, res) => renderVariety('uk', req, res));

module.exports = router;

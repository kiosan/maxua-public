/**
 * Route for the /variety page — promo page for the "Requisite Variety" book
 */

const express = require('express');
const router = express.Router();
const templateEngine = require('../templateEngine');
const { generateMetaTags, generateBreadcrumbsSchema, generatePersonSchema } = require('../seo');

const PAGE_TITLE = 'Requisite Variety: The Systems Method for Working with AI';
const PAGE_DESCRIPTION = 'Everyone has access to the same AI models. Yet the results differ by an order of magnitude.';
const DOMAIN = 'https://sbondar.com';

/**
 * Render the book promo page
 */
router.get('/variety', (req, res) => {
  try {
    const url = `${DOMAIN}/variety`;

    const metaTags = generateMetaTags({
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      url,
      type: 'article',
      keywords: 'Requisite Variety, Ashby, cybernetics, AI, LLM, systems thinking, software engineering, Sasha Bondar'
    });

    const structuredData = [
      generateBreadcrumbsSchema([
        { name: 'Home', url: '/' },
        { name: 'Requisite Variety', url: '/variety' }
      ], DOMAIN),
      generatePersonSchema({
        sameAs: ['https://www.linkedin.com/in/obondar/']
      })
    ].join('\n');

    const html = templateEngine.render('variety', {
      pageTitle: PAGE_TITLE,
      metaTags,
      structuredData,
      activePage: 'variety'
    });

    res.send(html);
  } catch (error) {
    console.error('Error rendering /variety page:', error);
    res.status(500).send(`<h1>500 - Server Error</h1><p>${error.message}</p>`);
  }
});

module.exports = router;

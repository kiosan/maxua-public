/**
 * Route for the landing page — simple personal home.
 */

const express = require('express');
const router = express.Router();
const templateEngine = require('../templateEngine');
const { generateMetaTags, generatePersonSchema } = require('../seo');

const PAGE_TITLE = 'Sasha Bondar';
const PAGE_DESCRIPTION = 'Engineer and entrepreneur. Writing «Requisite Variety», a book about a systems method for working with AI. Running reintech.io.';
const DOMAIN = 'https://sbondar.com';

router.get('/', (req, res) => {
  try {
    const metaTags = generateMetaTags({
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      url: `${DOMAIN}/`,
      type: 'website',
      keywords: 'Sasha Bondar, Requisite Variety, Reintech, AI, systems thinking'
    });

    const structuredData = generatePersonSchema({
      sameAs: ['https://www.linkedin.com/in/obondar/']
    });

    const html = templateEngine.render('home', {
      pageTitle: PAGE_TITLE,
      metaTags,
      structuredData,
      activePage: 'home'
    });

    res.send(html);
  } catch (error) {
    console.error('Error rendering home page:', error);
    res.status(500).send(`<h1>500 - Server Error</h1><p>${error.message}</p>`);
  }
});

module.exports = router;

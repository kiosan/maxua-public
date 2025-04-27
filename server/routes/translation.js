// server/routes/translation.js
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { rateLimiterMiddleware } = require('../middleware/rateLimiter');

router.post('/translate', rateLimiterMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }
    
    // Azure Translator API configuration
    const key = process.env.AZURE_TRANSLATOR_KEY;
    const endpoint = 'https://api.cognitive.microsofttranslator.com';
    const location = process.env.AZURE_TRANSLATOR_LOCATION || 'westeurope';
    
    // from=uk to force UA->EN translation
    // why? autodetect won't work if first half is in English :)
    const response = await fetch(`${endpoint}/translate?api-version=3.0&from=uk&to=en`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Ocp-Apim-Subscription-Region': location,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{ text }])
    });
    
    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }
    
    const result = await response.json();
    const translation = result[0]?.translations[0]?.text;
    
    return res.json({ translation });
  } catch (error) {
    console.error('Translation error:', error);
    return res.status(500).json({ error: 'Translation failed' });
  }
});

module.exports = router;

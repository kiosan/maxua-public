// server/routes/translation.js
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { rateLimiterMiddleware, translateText } = require('../utils');

router.post('/translate', rateLimiterMiddleware, async (req, res) => {
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'No text provided' });
  }

  try {
    const translation = await translateText(text);
    return res.json({ translation });
  } catch (error) {
    console.error('Translation error:', error);
    return res.status(500).json({ error: 'Translation failed' });
  }
});

module.exports = router;

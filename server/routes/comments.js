// routes/comments.js
const express = require('express');
const router = express.Router();

const { pool, rateLimiterMiddleware } = require('../utils');
const { v4: uuidv4 } = require('uuid');
const { sendEmail } = require('../sendEmail');


module.exports = router;

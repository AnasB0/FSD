const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticate } = require('../middleware/auth');
const logger = require('../config/logger');

const ASSISTANT_SERVICE_URL = process.env.ASSISTANT_SERVICE_URL || 'http://localhost:5004';

router.post('/query', authenticate, async (req, res, next) => {
  try {
    const { query, context } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const response = await axios.post(
      `${ASSISTANT_SERVICE_URL}/api/assistant/query`,
      {
        query,
        context: {
          ...context,
          userId: req.user.id,
          role: req.user.role,
          language: req.language
        }
      },
      {
        headers: {
          'Authorization': req.headers.authorization,
          'Content-Type': 'application/json',
          'Accept-Language': req.headers['accept-language'],
          'X-Request-ID': req.id
        },
        timeout: 60000
      }
    );

    logger.info('Assistant query processed', { 
      userId: req.user.id, 
      query: query.substring(0, 50),
      requestId: req.id
    });

    res.json(response.data);
  } catch (error) {
    logger.error('Assistant service error', { 
      error: error.message, 
      requestId: req.id 
    });
    
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
});

module.exports = router;

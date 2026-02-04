const express = require('express');
const axios = require('axios');
const Joi = require('joi');
const { authMiddleware } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const LLM_SERVICE_URL = process.env.LLM_SERVICE_URL || 'http://localhost:8084';

const querySchema = Joi.object({
  query: Joi.string().required().min(1).max(1000),
  context: Joi.object().optional()
});

router.post('/query', authMiddleware, async (req, res) => {
  try {
    const { error, value } = querySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: req.t('error.validation'),
        details: error.details 
      });
    }

    const response = await axios.post(
      `${LLM_SERVICE_URL}/api/assistant/query`,
      {
        ...value,
        userId: req.user.id,
        role: req.user.role
      },
      { headers: { Authorization: req.headers.authorization } }
    );
    
    res.status(response.status).json(response.data);
  } catch (error) {
    logger.error('Assistant query proxy error:', error.message);
    res.status(error.response?.status || 500).json(
      error.response?.data || { error: req.t('error.internal') }
    );
  }
});

module.exports = router;

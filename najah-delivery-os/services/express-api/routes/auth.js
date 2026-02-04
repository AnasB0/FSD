const express = require('express');
const router = express.Router();
const axios = require('axios');
const logger = require('../config/logger');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';

router.post('/login', async (req, res, next) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/login`, req.body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': req.id
      },
      timeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000
    });
    
    res.json(response.data);
  } catch (error) {
    logger.error('Auth service error', { 
      error: error.message, 
      requestId: req.id 
    });
    
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/register`, req.body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': req.id
      },
      timeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000
    });
    
    res.status(201).json(response.data);
  } catch (error) {
    logger.error('Auth service error', { 
      error: error.message, 
      requestId: req.id 
    });
    
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/refresh`, req.body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': req.id
      },
      timeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000
    });
    
    res.json(response.data);
  } catch (error) {
    logger.error('Auth service error', { 
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

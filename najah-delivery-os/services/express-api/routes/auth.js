const express = require('express');
const axios = require('axios');
const { authMiddleware } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:8081';

router.post('/register', async (req, res) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/register`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    logger.error('Auth register proxy error:', error.message);
    res.status(error.response?.status || 500).json(
      error.response?.data || { error: req.t('error.internal') }
    );
  }
});

router.post('/login', async (req, res) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/login`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    logger.error('Auth login proxy error:', error.message);
    res.status(error.response?.status || 500).json(
      error.response?.data || { error: req.t('error.internal') }
    );
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/refresh`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    logger.error('Auth refresh proxy error:', error.message);
    res.status(error.response?.status || 500).json(
      error.response?.data || { error: req.t('error.internal') }
    );
  }
});

router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const response = await axios.post(
      `${AUTH_SERVICE_URL}/api/auth/logout`,
      req.body,
      { headers: { Authorization: req.headers.authorization } }
    );
    res.status(response.status).json(response.data);
  } catch (error) {
    logger.error('Auth logout proxy error:', error.message);
    res.status(error.response?.status || 500).json(
      error.response?.data || { error: req.t('error.internal') }
    );
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(
      `${AUTH_SERVICE_URL}/api/auth/me`,
      { headers: { Authorization: req.headers.authorization } }
    );
    res.status(response.status).json(response.data);
  } catch (error) {
    logger.error('Auth me proxy error:', error.message);
    res.status(error.response?.status || 500).json(
      error.response?.data || { error: req.t('error.internal') }
    );
  }
});

module.exports = router;

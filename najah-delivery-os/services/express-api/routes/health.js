const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

router.get('/', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'express-api',
    version: process.env.npm_package_version || '1.0.0'
  };

  try {
    const dbState = mongoose.connection.readyState;
    health.database = {
      status: dbState === 1 ? 'connected' : 'disconnected',
      state: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState]
    };

    if (dbState !== 1) {
      return res.status(503).json({ ...health, status: 'degraded' });
    }

    res.json(health);
  } catch (error) {
    res.status(503).json({
      ...health,
      status: 'error',
      error: error.message
    });
  }
});

module.exports = router;

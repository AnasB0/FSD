/**
 * Health Check Routes
 * 
 * Provides endpoints for monitoring service health and readiness.
 * Used by orchestrators (Kubernetes, Docker Swarm) and monitoring tools.
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const logger = require('../config/logger');

/**
 * GET /health
 * Basic health check - returns 200 if service is running
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'ingestion-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * GET /health/ready
 * Readiness check - returns 200 only if service is ready to handle requests
 * Checks database connectivity and other dependencies
 */
router.get('/ready', async (req, res) => {
  const checks = {
    service: 'up',
    database: 'unknown',
    express_api: 'not_checked'
  };

  let isReady = true;

  // Check MongoDB connection
  try {
    if (mongoose.connection.readyState === 1) {
      checks.database = 'connected';
    } else {
      checks.database = 'disconnected';
      isReady = false;
    }
  } catch (err) {
    logger.error('Database health check failed', { error: err.message });
    checks.database = 'error';
    isReady = false;
  }

  const statusCode = isReady ? 200 : 503;

  res.status(statusCode).json({
    status: isReady ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /health/live
 * Liveness check - returns 200 if service process is alive
 * Should never fail unless process is completely dead
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

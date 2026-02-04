const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'Auth Service',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

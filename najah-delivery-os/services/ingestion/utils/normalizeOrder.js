const axios = require('axios');
const logger = require('./logger');

const triggerNormalization = async (orderId) => {
  try {
    const expressApiUrl = process.env.EXPRESS_API_URL || 'http://localhost:8081';
    const url = `${expressApiUrl}/api/orders/${orderId}/normalize`;
    
    logger.info('Triggering normalization', { orderId, url });
    
    const response = await axios.post(url, {}, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    logger.info('Normalization triggered successfully', { 
      orderId, 
      status: response.status 
    });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to trigger normalization', {
      orderId,
      error: error.message,
      response: error.response?.data
    });
    throw error;
  }
};

module.exports = { triggerNormalization };

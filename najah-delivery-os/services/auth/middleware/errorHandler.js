const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = req.language === 'ar' ? 'خطأ في الخادم' : 'Internal server error';
  
  logger.error({
    requestId: req.id,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(statusCode).json({
    success: false,
    message: err.message || message,
    requestId: req.id
  });
}

module.exports = errorHandler;

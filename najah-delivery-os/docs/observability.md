# Observability

This document describes logging, monitoring, and tracing practices for Najah Delivery OS.

## Table of Contents

- [Logging Standards](#logging-standards)
- [Monitoring](#monitoring)
- [Tracing](#tracing)
- [Error Handling](#error-handling)
- [Performance Monitoring](#performance-monitoring)

## Logging Standards

### Log Levels

| Level | Usage | Examples |
|-------|-------|----------|
| **error** | System failures, exceptions | Database connection failed, unhandled errors |
| **warn** | Recoverable issues, deprecations | Retry attempt, rate limit approaching |
| **info** | Business events, state changes | Order created, route optimized, user login |
| **debug** | Detailed diagnostic info | Query parameters, function entry/exit |

### Structured Logging (Winston)

All Node.js services use Winston for structured JSON logging:

```javascript
// services/express-api/utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: process.env.SERVICE_NAME || 'express-api',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

module.exports = logger;
```

### Log Format

**Standard Log Entry**

```json
{
  "timestamp": "2024-01-16T08:30:15.123Z",
  "level": "info",
  "service": "express-api",
  "environment": "production",
  "requestId": "a3f4b2c1-d5e6-f7g8-h9i0-j1k2l3m4n5o6",
  "userId": "507f1f77bcf86cd799439011",
  "method": "POST",
  "path": "/api/orders",
  "statusCode": 201,
  "duration": 245,
  "message": "Order created successfully",
  "orderId": "507f1f77bcf86cd799439013"
}
```

**Error Log Entry**

```json
{
  "timestamp": "2024-01-16T08:30:15.123Z",
  "level": "error",
  "service": "express-api",
  "requestId": "a3f4b2c1-d5e6-f7g8-h9i0-j1k2l3m4n5o6",
  "userId": "507f1f77bcf86cd799439011",
  "message": "Failed to create order",
  "error": {
    "name": "ValidationError",
    "message": "Order validation failed: address.ar: Path `address.ar` is required.",
    "stack": "ValidationError: Order validation failed...\n    at model.Document.invalidate..."
  },
  "input": {
    "merchantId": "507f1f77bcf86cd799439012"
  }
}
```

### Python Logging (Flask/FastAPI)

```python
# services/optimizer/app.py
import logging
import json
from datetime import datetime

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname.lower(),
            'service': 'optimizer',
            'message': record.getMessage(),
            'logger': record.name
        }
        
        if hasattr(record, 'requestId'):
            log_entry['requestId'] = record.requestId
        
        if record.exc_info:
            log_entry['error'] = {
                'type': record.exc_info[0].__name__,
                'message': str(record.exc_info[1]),
                'stack': self.formatException(record.exc_info)
            }
        
        return json.dumps(log_entry)

handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())

logger = logging.getLogger('optimizer')
logger.setLevel(logging.INFO)
logger.addHandler(handler)

# Usage
logger.info('Route optimization started', extra={'requestId': request_id})
```

### What to Log

**DO Log:**
- ✅ Request/response metadata (method, path, status, duration)
- ✅ Business events (order created, route optimized)
- ✅ Authentication events (login, logout, token refresh)
- ✅ Authorization failures (403 errors)
- ✅ External API calls (OSRM, OpenRouter)
- ✅ Database operations (connection, queries)
- ✅ Performance metrics (response times, query duration)
- ✅ System events (service start/stop, health checks)

**DON'T Log:**
- ❌ Passwords (plain or hashed)
- ❌ JWT tokens (full token)
- ❌ API keys
- ❌ Credit card numbers
- ❌ Full customer addresses (log city only)
- ❌ Phone numbers (log last 4 digits only)
- ❌ Personal identification numbers

### Data Masking

```javascript
// Mask sensitive fields before logging
function maskSensitive(obj) {
  const masked = { ...obj };
  
  if (masked.password) {
    masked.password = '***REDACTED***';
  }
  
  if (masked.email) {
    const [username, domain] = masked.email.split('@');
    masked.email = `${username.substring(0, 2)}***@${domain}`;
  }
  
  if (masked.phone) {
    masked.phone = `***${masked.phone.slice(-4)}`;
  }
  
  if (masked.address) {
    masked.address = `${masked.address.city}, ${masked.address.district}`;
  }
  
  return masked;
}

// Usage
logger.info('User registered', maskSensitive(userData));
```

### Request Logging Middleware

```javascript
// services/express-api/middleware/logging.js
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

function requestLogger(req, res, next) {
  // Generate or use existing request ID
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  
  const startTime = Date.now();
  
  // Log request
  logger.info('Incoming request', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    query: req.query,
    userId: req.user?.userId,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    const logLevel = res.statusCode >= 500 ? 'error' : 
                     res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[logLevel]('Request completed', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.userId
    });
  });
  
  next();
}

module.exports = requestLogger;
```

## Monitoring

### Health Check Endpoints

All services expose health check endpoints:

**Basic Health Check**
```javascript
// GET /health
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'express-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

**Readiness Check (Database)**
```javascript
// GET /health/ready
app.get('/health/ready', async (req, res) => {
  try {
    // Check database connection
    await mongoose.connection.db.admin().ping();
    
    res.json({
      status: 'ready',
      service: 'express-api',
      checks: {
        database: 'ok',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Readiness check failed', { error: error.message });
    
    res.status(503).json({
      status: 'not_ready',
      service: 'express-api',
      checks: {
        database: 'failed',
        error: error.message
      }
    });
  }
});
```

**Liveness Check**
```javascript
// GET /health/live
app.get('/health/live', (req, res) => {
  res.json({
    status: 'alive',
    service: 'express-api',
    timestamp: new Date().toISOString()
  });
});
```

### Metrics Collection

**Key Metrics**

| Metric | Description | Collection |
|--------|-------------|------------|
| **Request Rate** | Requests per second | Winston logs |
| **Error Rate** | 5xx errors per second | Winston logs |
| **Response Time** | p50, p95, p99 latency | Request middleware |
| **Database Queries** | Query count and duration | Mongoose middleware |
| **Active Connections** | Open DB connections | Mongoose pool stats |
| **Memory Usage** | Heap used/total | `process.memoryUsage()` |
| **CPU Usage** | CPU percentage | `process.cpuUsage()` |

**Metrics Endpoint**

```javascript
// GET /metrics (Prometheus format)
const promClient = require('prom-client');

const register = new promClient.Registry();

// HTTP request counter
const httpRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status_code'],
  registers: [register]
});

// HTTP request duration histogram
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'path', 'status_code'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  registers: [register]
});

// Middleware to collect metrics
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    httpRequestCounter.labels(req.method, req.route?.path || req.path, res.statusCode).inc();
    httpRequestDuration.labels(req.method, req.route?.path || req.path, res.statusCode).observe(duration);
  });
  
  next();
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### Service-Specific Monitoring

**Express API**
- Order creation rate
- Route optimization request count
- Authentication success/failure rate
- Geocoding request count

**Optimizer**
- Optimization duration (by order count)
- OSRM API latency
- Failed optimizations
- Orders optimized per minute

**Auth Service**
- Login success/failure rate
- Token refresh rate
- Active sessions count
- Password reset requests

**Payments**
- Payment intent creation rate
- Payment success/failure rate
- Payment method distribution

### Alerting Rules

**Critical Alerts (PagerDuty/Slack)**
- Error rate > 5% for 5 minutes
- Response time p95 > 2 seconds for 10 minutes
- Database connection failures
- Service downtime > 1 minute
- Memory usage > 90% for 5 minutes

**Warning Alerts (Email/Slack)**
- Error rate > 1% for 15 minutes
- Response time p95 > 1 second for 15 minutes
- Disk space > 80%
- Failed payment rate > 10%

## Tracing

### Request ID Propagation

Request IDs are propagated across all services for end-to-end tracing:

```mermaid
sequenceDiagram
    participant C as Client
    participant EA as Express API
    participant AUTH as Auth Service
    participant OPT as Optimizer

    C->>EA: POST /api/orders<br/>X-Request-ID: abc123
    Note over EA: Log with requestId: abc123
    EA->>AUTH: Verify token<br/>X-Request-ID: abc123
    Note over AUTH: Log with requestId: abc123
    AUTH-->>EA: Token valid
    EA->>OPT: Optimize route<br/>X-Request-ID: abc123
    Note over OPT: Log with requestId: abc123
    OPT-->>EA: Route optimized
    EA-->>C: Response<br/>X-Request-ID: abc123
```

**Implementation**

```javascript
// Express API calling Auth Service
const axios = require('axios');

async function verifyToken(token, requestId) {
  try {
    const response = await axios.post(
      'http://auth:8081/verify',
      { token },
      {
        headers: {
          'X-Request-ID': requestId
        }
      }
    );
    
    return response.data;
  } catch (error) {
    logger.error('Token verification failed', {
      requestId,
      error: error.message
    });
    throw error;
  }
}

// Usage in route handler
app.post('/api/orders', async (req, res) => {
  const user = await verifyToken(req.headers.authorization, req.id);
  // ... create order
});
```

### Correlation Across Services

Logs can be correlated using request ID:

```bash
# Find all logs for a specific request
grep "a3f4b2c1-d5e6-f7g8-h9i0-j1k2l3m4n5o6" logs/*.log

# Using CloudWatch Insights
fields @timestamp, service, message
| filter requestId = "a3f4b2c1-d5e6-f7g8-h9i0-j1k2l3m4n5o6"
| sort @timestamp asc
```

### Distributed Tracing (Future)

For production at scale, consider OpenTelemetry:

```javascript
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');

const provider = new NodeTracerProvider();
provider.addSpanProcessor(
  new SimpleSpanProcessor(
    new JaegerExporter({
      serviceName: 'express-api',
      endpoint: 'http://jaeger:14268/api/traces'
    })
  )
);
provider.register();
```

## Error Handling

### Error Response Format

**Standard Error Response**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid order data",
    "details": [
      {
        "field": "address.ar",
        "message": "Arabic address is required"
      }
    ],
    "requestId": "a3f4b2c1-d5e6-f7g8-h9i0-j1k2l3m4n5o6"
  }
}
```

### Global Error Handler

```javascript
// services/express-api/middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  // Log error with full context
  logger.error('Unhandled error', {
    requestId: req.id,
    userId: req.user?.userId,
    method: req.method,
    path: req.path,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack
    }
  });
  
  // Determine status code
  const statusCode = err.statusCode || err.status || 500;
  
  // Production: Don't leak error details
  const response = {
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An error occurred' 
        : err.message,
      requestId: req.id
    }
  };
  
  // Development: Include stack trace
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = err.stack;
  }
  
  res.status(statusCode).json(response);
}

module.exports = errorHandler;
```

### Error Types

**Custom Error Classes**

```javascript
// services/express-api/errors/AppError.js
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError
};
```

**Usage**

```javascript
const { NotFoundError, ForbiddenError } = require('../errors/AppError');

app.get('/api/orders/:id', async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      throw new NotFoundError('Order');
    }
    
    if (order.merchantId.toString() !== req.user.merchantId.toString()) {
      throw new ForbiddenError('Access to this order is denied');
    }
    
    res.json(order);
  } catch (error) {
    next(error);
  }
});
```

### Async Error Handling

**Wrapper for Async Routes**

```javascript
// services/express-api/utils/asyncHandler.js
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;

// Usage
const asyncHandler = require('../utils/asyncHandler');

app.get('/api/orders', asyncHandler(async (req, res) => {
  const orders = await Order.find({ merchantId: req.user.merchantId });
  res.json(orders);
}));
```

## Performance Monitoring

### Database Query Monitoring

```javascript
// Mongoose slow query logging
mongoose.set('debug', (collectionName, method, query, doc) => {
  const startTime = Date.now();
  
  // After query executes
  process.nextTick(() => {
    const duration = Date.now() - startTime;
    
    if (duration > 100) { // Slow query threshold: 100ms
      logger.warn('Slow database query', {
        collection: collectionName,
        method,
        query: JSON.stringify(query),
        duration
      });
    }
  });
});
```

### Response Time Monitoring

**Per-Route Timing**

```javascript
const responseTimeMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    if (duration > 1000) { // Slow response threshold: 1 second
      logger.warn('Slow response', {
        requestId: req.id,
        method: req.method,
        path: req.path,
        duration,
        statusCode: res.statusCode
      });
    }
  });
  
  next();
};

app.use(responseTimeMiddleware);
```

### Memory Leak Detection

```javascript
// Log memory usage every 5 minutes
setInterval(() => {
  const memoryUsage = process.memoryUsage();
  
  logger.info('Memory usage', {
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
    rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
    external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB'
  });
  
  // Alert if heap used exceeds 80% of heap total
  if (memoryUsage.heapUsed / memoryUsage.heapTotal > 0.8) {
    logger.warn('High memory usage detected', {
      percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
    });
  }
}, 5 * 60 * 1000);
```

### External API Monitoring

```javascript
// OSRM API latency tracking
async function callOSRM(coordinates) {
  const startTime = Date.now();
  
  try {
    const response = await axios.get(
      `http://osrm:5000/route/v1/driving/${coordinates}`,
      { timeout: 5000 }
    );
    
    const duration = Date.now() - startTime;
    
    logger.info('OSRM API call', {
      duration,
      coordinates: coordinates.length,
      success: true
    });
    
    return response.data;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('OSRM API call failed', {
      duration,
      error: error.message
    });
    
    throw error;
  }
}
```

## Log Aggregation (Production)

### CloudWatch Logs

**Configuration**

```javascript
// Add CloudWatch transport
const WinstonCloudWatch = require('winston-cloudwatch');

if (process.env.NODE_ENV === 'production') {
  logger.add(new WinstonCloudWatch({
    logGroupName: '/najah-delivery/express-api',
    logStreamName: () => {
      const date = new Date().toISOString().split('T')[0];
      return `${date}/${process.env.HOSTNAME}`;
    },
    awsRegion: process.env.AWS_REGION || 'me-south-1'
  }));
}
```

**CloudWatch Insights Queries**

```sql
-- Find all errors in last hour
fields @timestamp, level, message, error.message
| filter level = "error"
| sort @timestamp desc
| limit 100

-- Request duration by endpoint
fields path, duration
| stats avg(duration), max(duration), count(*) by path
| sort avg(duration) desc

-- Authentication failures
fields @timestamp, userId, message, ipAddress
| filter action = "user.login" and statusCode = 401
| sort @timestamp desc
```

## Related Documentation

- [Architecture](architecture.md) - System design
- [Security](security.md) - Security and audit logging
- [Runbook](runbook.md) - Troubleshooting procedures

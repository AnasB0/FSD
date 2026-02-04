# Payments Service - Najah Delivery OS

Payment processing service for the Najah Delivery OS platform. Handles payment intents, confirmations, cancellations, webhooks, and reconciliation.

## ⚠️ STUB Implementation Notice

This is a **STUB implementation** that simulates payment flows without actual payment gateway integration. It provides the complete service structure and API interface needed for the platform, but payment confirmations are simulated.

### Production Integration TODO

Before deploying to production, integrate with real payment gateways:

1. **MADA/Hyperpay Integration**
   - Implement actual payment session creation
   - Add real transaction verification
   - Configure production credentials
   - File: `routes/payments.js` (search for "STUB" comments)

2. **STC Pay Integration**
   - Implement STC Pay API calls
   - Add webhook signature verification
   - Configure merchant credentials
   - File: `routes/payments.js` (search for "STUB" comments)

3. **Webhook Authentication**
   - Implement gateway-specific signature validation
   - File: `middleware/webhookAuth.js`

4. **Event Queue Integration**
   - Add message queue (RabbitMQ/Kafka) for order updates
   - File: `routes/payments.js` webhook handler

## Features

- ✅ Payment intent creation and management
- ✅ Multiple payment methods (MADA, STC Pay, COD, Apple Pay, Credit Card)
- ✅ Payment confirmation and cancellation
- ✅ Webhook handling for gateway callbacks
- ✅ Payment reconciliation for accounting
- ✅ JWT authentication
- ✅ Webhook signature validation
- ✅ Rate limiting
- ✅ Request ID tracing
- ✅ JSON logging with Winston
- ✅ i18n support (Arabic/English)
- ✅ Security headers with Helmet
- ✅ CORS configuration

## Supported Payment Methods

| Method | Code | Description | Status |
|--------|------|-------------|--------|
| MADA | `MADA` | Saudi debit cards | Stub |
| STC Pay | `STC_PAY` | STC Pay digital wallet | Stub |
| Cash on Delivery | `COD` | Cash payment on delivery | Stub |
| Apple Pay | `APPLE_PAY` | Apple Pay wallet | Stub |
| Credit Card | `CREDIT_CARD` | International credit cards | Stub |

## Payment Statuses

- `PENDING` - Payment intent created, awaiting confirmation
- `CONFIRMED` - Payment successfully confirmed
- `CANCELLED` - Payment cancelled before confirmation
- `FAILED` - Payment attempt failed
- `REFUNDED` - Payment refunded after confirmation

## Installation

```bash
cd services/payments
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:

```env
NODE_ENV=development
PORT=3003
MONGODB_URI=mongodb://localhost:27017/payments
JWT_SECRET=your-secret-key
WEBHOOK_SECRET=your-webhook-secret
CORS_ORIGIN=http://localhost:3000
```

## Running the Service

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Docker
```bash
docker build -t payments-service .
docker run -p 3003:3003 --env-file .env payments-service
```

## API Endpoints

### Health Check
```
GET /health
```

### Payment Intents

#### Create Payment Intent
```http
POST /api/payments/intents
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "order_123",
  "merchantId": "merchant_456",
  "amount": 150.00,
  "currency": "SAR",
  "method": "MADA",
  "customerPhone": "+966501234567",
  "customerEmail": "customer@example.com",
  "metadata": {}
}
```

#### Get Payment Intent
```http
GET /api/payments/intents/:id
Authorization: Bearer <token>
```

#### Confirm Payment
```http
POST /api/payments/intents/:id/confirm
Authorization: Bearer <token>
Content-Type: application/json

{
  "gatewayTransactionId": "txn_789",
  "metadata": {}
}
```

#### Cancel Payment
```http
POST /api/payments/intents/:id/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Customer requested cancellation"
}
```

### Webhooks

#### Payment Gateway Webhook
```http
POST /api/payments/webhook
X-Webhook-Signature: <signature>
X-Webhook-Timestamp: <timestamp>
Content-Type: application/json

{
  "eventType": "payment.succeeded",
  "intentId": "intent_id",
  "transactionId": "txn_id",
  "status": "CONFIRMED",
  "metadata": {}
}
```

### Reconciliation

#### Generate Reconciliation Report
```http
GET /api/payments/reconcile?startDate=2024-01-01&endDate=2024-01-31&merchantId=merchant_456
Authorization: Bearer <token>
```

## Authentication

The service uses JWT bearer token authentication. In development mode, you can use `stub-token`:

```bash
Authorization: Bearer stub-token
```

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

## API Documentation

OpenAPI specification is available at `openapi.yaml`. View with Swagger UI or import into Postman.

## Project Structure

```
payments/
├── config/
│   └── logger.js           # Winston logger configuration
├── middleware/
│   ├── auth.js             # JWT authentication
│   ├── webhookAuth.js      # Webhook signature validation
│   ├── i18n.js             # Internationalization
│   ├── requestId.js        # Request ID generation
│   └── errorHandler.js     # Global error handler
├── models/
│   └── PaymentIntent.js    # Payment intent schema
├── routes/
│   ├── health.js           # Health check routes
│   └── payments.js         # Payment routes
├── tests/
│   └── payments.test.js    # Test suite
├── .env.example            # Environment variables template
├── Dockerfile              # Docker configuration
├── index.js                # Application entry point
├── openapi.yaml            # OpenAPI specification
├── package.json            # Dependencies
└── README.md               # This file
```

## Logging

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- Console (development mode)

Log format: JSON with timestamp, request ID, and context

## Security

- Helmet for security headers
- CORS with configurable origins
- Rate limiting (100 requests per 15 minutes)
- JWT token verification
- Webhook signature validation
- Request ID tracing
- Non-root Docker user

## i18n Support

The service supports Arabic and English. Set language via `Accept-Language` header:

```http
Accept-Language: ar
Accept-Language: en
```

Default language: Arabic

## Error Handling

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

Common error codes:
- `VALIDATION_ERROR` - Invalid input
- `NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - Missing or invalid token
- `INVALID_STATUS` - Invalid payment status transition
- `INTERNAL_ERROR` - Server error

## Monitoring

Health check endpoint provides:
- Service status
- Database connection status
- Uptime
- Version

## Contributing

1. Search for "STUB" comments in code to find integration points
2. Implement real payment gateway integrations
3. Add comprehensive tests
4. Update documentation
5. Submit pull request

## License

MIT License - see LICENSE file for details

## Support

For questions or issues:
- Email: dev@najahdelivery.com
- Slack: #payments-service
- Docs: https://docs.najahdelivery.com/payments

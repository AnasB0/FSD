# Payments Service

Payment intent management service for Najah Delivery OS supporting Mada, STC Pay, and Cash on Delivery for the KSA market.

## Features

- **Multiple Payment Methods**: Mada (Saudi debit cards), STC Pay, Cash on Delivery
- **Payment Intent Management**: Create, confirm, cancel payment intents
- **Webhook Support**: Secure webhook handling with HMAC signature verification
- **Reconciliation**: Query and reconcile payment transactions
- **JWT Authentication**: Secure API endpoints
- **Rate Limiting**: Protection against abuse
- **Comprehensive Logging**: Winston-based logging
- **API Documentation**: OpenAPI 3.0 specification

## Tech Stack

- **Node.js 18** with Express 4.18
- **MongoDB** with Mongoose 8.0
- **JWT** authentication
- **Joi** validation
- **Helmet** security
- **Winston** logging
- **Jest** testing

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your configuration
```

## Environment Variables

See `.env.example` for required variables:

- `PAYMENTS_PORT`: Service port (default: 8082)
- `MONGO_URI`: MongoDB connection string
- `JWT_ACCESS_SECRET`: JWT secret key
- `MADA_API_KEY`: Mada payment gateway API key
- `STC_PAY_API_KEY`: STC Pay API key
- `WEBHOOK_SECRET`: Webhook signature secret
- `CORS_ORIGIN`: Allowed CORS origin

## Running the Service

```bash
# Development
npm run dev

# Production
npm start

# Testing
npm test

# With Docker
docker build -t payments-service .
docker run -p 8082:8082 --env-file .env payments-service
```

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Payment Intents
- `POST /payments/intents` - Create payment intent
- `GET /payments/intents/:id` - Get payment intent
- `POST /payments/intents/:id/confirm` - Confirm payment
- `POST /payments/intents/:id/cancel` - Cancel payment

### Webhooks
- `POST /payments/webhook` - Receive payment provider webhooks

### Reconciliation
- `GET /payments/reconcile` - Get payment data for reconciliation

See `openapi.yaml` for full API documentation.

## Payment Methods

### Mada
Saudi Arabia's domestic debit card scheme. Transactions are processed through the Mada network.

### STC Pay
Digital wallet service by Saudi Telecom Company. Popular mobile payment method in KSA.

### Cash on Delivery (COD)
Payment collected by delivery driver upon order delivery.

## Webhook Security

Webhooks are verified using HMAC-SHA256 signatures:

1. Compute: `HMAC-SHA256(webhook_secret, request_body)`
2. Compare with `x-payment-signature` header
3. Reject if mismatch

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

## Stub Implementation

This is a **stub service** for development and testing. Payment processors return mock responses:

- All payment confirmations succeed
- Transaction IDs are generated randomly
- No actual payment gateway integration

For production, implement real payment gateway integrations in `utils/paymentProcessor.js`.

## Security

- JWT authentication on all protected endpoints
- Rate limiting (100 requests per 15 minutes)
- Helmet middleware for HTTP security
- HMAC signature verification for webhooks
- Input validation with Joi

## Logging

Winston logger configured with:
- Console output in development
- File output (`error.log`, `combined.log`)
- JSON format with timestamps
- Error stack traces

## License

MIT

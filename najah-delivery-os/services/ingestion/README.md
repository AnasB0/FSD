# Ingestion/Webhooks Service

Securely receives webhooks from merchant systems, validates HMAC signatures, and triggers downstream processing.

## Features

- **HMAC-SHA256 Signature Verification**: Secure webhook authentication
- **Rate Limiting**: Prevent abuse with configurable rate limits
- **MongoDB Integration**: Persistent storage for orders and webhook logs
- **Async Order Normalization**: Triggers geocoding service after webhook processing
- **Comprehensive Logging**: Winston-based logging with file and console output
- **API Documentation**: OpenAPI 3.0 specification included

## Architecture

```
Merchant System → [Webhook] → Signature Verify → Validate Payload → Store Order → Trigger Normalization
```

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```env
INGESTION_PORT=8083
MONGO_URI=mongodb://localhost:27017/najah_delivery
EXPRESS_API_URL=http://localhost:8081
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Testing
```bash
npm test
```

## API Endpoints

### POST /webhooks/:merchantId/orders

Receive order webhook from merchant system.

**Headers:**
- `Content-Type: application/json`
- `x-merchant-signature`: HMAC-SHA256 signature

**Request Body:**
```json
{
  "externalOrderId": "ORD-2024-001",
  "customerName": "Ahmed Ali",
  "customerPhone": "+966501234567",
  "address": {
    "ar": "شارع الملك فهد، الرياض",
    "en": "King Fahd Road, Riyadh",
    "components": {
      "street": "King Fahd Road",
      "city": "Riyadh"
    }
  },
  "items": [
    {
      "name": "Pizza",
      "quantity": 2,
      "price": 45.00
    }
  ],
  "totalAmount": 90.00,
  "timeWindow": {
    "start": "2024-01-15T14:00:00Z",
    "end": "2024-01-15T16:00:00Z"
  }
}
```

**Response:**
```json
{
  "received": true,
  "orderId": "507f191e810c19729de860ea",
  "webhookId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "uptime": 3600,
  "mongodb": "connected"
}
```

## Signature Generation

Generate HMAC-SHA256 signature for webhook:

```javascript
const crypto = require('crypto');

const payload = JSON.stringify(orderData);
const signature = crypto.createHmac('sha256', webhookSecret)
  .update(payload)
  .digest('hex');
```

## Docker

Build:
```bash
docker build -t najah-ingestion-service .
```

Run:
```bash
docker run -p 8083:8083 --env-file .env najah-ingestion-service
```

## Models

### WebhookLog
- Tracks all incoming webhooks
- Records signature, payload, status
- Links to merchant and processing status

### Order
- Stores order data from webhooks
- Unique index on merchantId + externalOrderId
- Status tracking through delivery lifecycle

### Merchant
- Minimal schema for webhook secret lookup
- Active/inactive status

## Security

- HMAC-SHA256 signature verification on all webhooks
- Rate limiting (100 requests per 15 minutes per IP)
- Helmet.js security headers
- Raw body parsing for signature verification
- Input validation with Joi

## Logging

Winston logger with:
- File logging (error.log, combined.log)
- Console output in development
- Structured JSON logging
- Service-specific metadata

## Testing

Comprehensive test suite covering:
- Valid signature acceptance
- Invalid signature rejection
- Missing signature handling
- Payload validation
- Merchant verification
- Order upsert logic
- Health checks

## License

MIT

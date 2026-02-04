# Najah Delivery OS - Ingestion/Webhooks Service

![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen) ![Express](https://img.shields.io/badge/express-4.18.2-blue) ![License](https://img.shields.io/badge/license-MIT-green)

A secure webhook ingestion service for Najah Delivery OS that receives and processes merchant order data with HMAC-SHA256 authentication.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Webhook Integration Guide](#webhook-integration-guide)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## ✨ Features

- **HMAC-SHA256 Authentication**: Cryptographic signature verification for webhook security
- **Request Validation**: Comprehensive payload validation using Joi
- **Audit Logging**: Complete webhook event tracking with retry mechanism
- **Rate Limiting**: IP-based rate limiting to prevent abuse
- **Request Tracing**: Unique request IDs for correlation across services
- **Internationalization**: Multi-language support (English, Arabic)
- **Health Checks**: Kubernetes-ready health and readiness endpoints
- **Graceful Shutdown**: Proper connection cleanup on termination
- **Error Recovery**: Exponential backoff retry mechanism for failed webhooks
- **Security Headers**: Helmet.js for HTTP security headers
- **CORS Support**: Configurable cross-origin resource sharing

## 🏗 Architecture

```
┌─────────────┐
│  Merchant   │
│   System    │
└──────┬──────┘
       │ POST /webhooks/:merchantId/orders
       │ + x-merchant-signature header
       ▼
┌─────────────────────────────────────────┐
│      Ingestion Service (Port 3001)      │
├─────────────────────────────────────────┤
│  1. Request ID Generation               │
│  2. Rate Limiting                       │
│  3. HMAC Signature Verification         │
│  4. Payload Validation (Joi)            │
│  5. WebhookLog Creation                 │
│  6. Order Persistence                   │
│  7. Async Normalization Trigger         │
└──────┬──────────────────────┬───────────┘
       │                      │
       │                      └──────────────┐
       ▼                                     ▼
┌─────────────┐                    ┌──────────────┐
│   MongoDB   │                    │ Express API  │
│ WebhookLogs │                    │ (Port 3002)  │
│   Orders    │                    │ Normalization│
└─────────────┘                    └──────────────┘
```

## 📦 Prerequisites

- **Node.js**: >= 18.0.0
- **MongoDB**: >= 5.0
- **npm**: >= 9.0.0

## 🚀 Installation

```bash
# Clone the repository
git clone https://github.com/najah-delivery/delivery-os.git
cd najah-delivery-os/services/ingestion

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start the service
npm start
```

## ⚙️ Configuration

Create a `.env` file based on `.env.example`:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/najah_ingestion

# Security - Webhook HMAC Secret
# Generate using: openssl rand -hex 32
WEBHOOK_SECRET=your-webhook-secret-key-here

# External Service URLs
EXPRESS_API_URL=http://localhost:3002

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000        # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100        # 100 requests per window

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# CORS Configuration
CORS_ORIGIN=*
```

### Generate Webhook Secret

```bash
# Generate a secure 256-bit secret
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🔌 Webhook Integration Guide

### Overview

Merchants integrate with Najah Delivery OS by sending HTTP POST requests to the webhook endpoint with HMAC-SHA256 signature authentication.

### Step 1: Obtain Credentials

Contact Najah Delivery OS to receive:
- **Merchant ID**: Your unique merchant identifier
- **Webhook Secret**: A 256-bit secret key for signing requests

### Step 2: Implement Signature Generation

The signature ensures request authenticity and integrity using HMAC-SHA256.

#### Node.js Example

```javascript
const crypto = require('crypto');
const axios = require('axios');

// Your credentials
const merchantId = 'merchant_abc123';
const webhookSecret = 'your-webhook-secret-from-najah';
const webhookUrl = 'https://ingestion.najahdelivery.com/webhooks';

// Order data
const orderData = {
  orderNumber: 'ORD-2024-001',
  items: [
    {
      sku: 'ITEM-001',
      name: 'Premium Widget',
      quantity: 2,
      price: 45.99,
      weight: 0.5
    }
  ],
  customer: {
    name: 'Ahmed Al-Rashid',
    phone: '+966501234567',
    email: 'ahmed@example.com'
  },
  address: {
    street: 'King Fahd Road',
    city: 'Riyadh',
    district: 'Al Olaya',
    building: 'Tower 5',
    floor: '12',
    apartment: '1205',
    coordinates: {
      latitude: 24.7136,
      longitude: 46.6753
    }
  },
  timeWindow: {
    start: '2024-01-15T09:00:00Z',
    end: '2024-01-15T17:00:00Z'
  },
  notes: 'Please call before delivery',
  priority: 'HIGH'
};

// Convert to JSON string (IMPORTANT: No formatting)
const payload = JSON.stringify(orderData);

// Compute HMAC-SHA256 signature
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(payload)
  .digest('hex');

console.log('Signature:', signature);

// Send webhook request
async function sendWebhook() {
  try {
    const response = await axios.post(
      `${webhookUrl}/${merchantId}/orders`,
      orderData,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-merchant-signature': signature
        }
      }
    );

    console.log('Success:', response.data);
    console.log('Order ID:', response.data.orderId);
    console.log('Request ID:', response.data.requestId);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

sendWebhook();
```

#### Python Example

```python
import hmac
import hashlib
import json
import requests

# Your credentials
merchant_id = 'merchant_abc123'
webhook_secret = 'your-webhook-secret-from-najah'
webhook_url = 'https://ingestion.najahdelivery.com/webhooks'

# Order data
order_data = {
    'orderNumber': 'ORD-2024-001',
    'items': [
        {
            'sku': 'ITEM-001',
            'name': 'Premium Widget',
            'quantity': 2,
            'price': 45.99,
            'weight': 0.5
        }
    ],
    'customer': {
        'name': 'Ahmed Al-Rashid',
        'phone': '+966501234567',
        'email': 'ahmed@example.com'
    },
    'address': {
        'street': 'King Fahd Road',
        'city': 'Riyadh',
        'district': 'Al Olaya',
        'building': 'Tower 5',
        'floor': '12',
        'apartment': '1205',
        'coordinates': {
            'latitude': 24.7136,
            'longitude': 46.6753
        }
    },
    'timeWindow': {
        'start': '2024-01-15T09:00:00Z',
        'end': '2024-01-15T17:00:00Z'
    },
    'notes': 'Please call before delivery',
    'priority': 'HIGH'
}

# Convert to JSON string (no whitespace)
payload = json.dumps(order_data, separators=(',', ':'))

# Compute HMAC-SHA256 signature
signature = hmac.new(
    webhook_secret.encode('utf-8'),
    payload.encode('utf-8'),
    hashlib.sha256
).hexdigest()

print(f'Signature: {signature}')

# Send webhook request
headers = {
    'Content-Type': 'application/json',
    'x-merchant-signature': signature
}

try:
    response = requests.post(
        f'{webhook_url}/{merchant_id}/orders',
        data=payload,
        headers=headers
    )
    
    response.raise_for_status()
    result = response.json()
    
    print('Success:', result)
    print('Order ID:', result['orderId'])
    print('Request ID:', result['requestId'])
except requests.exceptions.RequestException as e:
    print('Error:', e)
    if hasattr(e, 'response') and e.response is not None:
        print('Response:', e.response.json())
```

#### PHP Example

```php
<?php

// Your credentials
$merchantId = 'merchant_abc123';
$webhookSecret = 'your-webhook-secret-from-najah';
$webhookUrl = 'https://ingestion.najahdelivery.com/webhooks';

// Order data
$orderData = [
    'orderNumber' => 'ORD-2024-001',
    'items' => [
        [
            'sku' => 'ITEM-001',
            'name' => 'Premium Widget',
            'quantity' => 2,
            'price' => 45.99,
            'weight' => 0.5
        ]
    ],
    'customer' => [
        'name' => 'Ahmed Al-Rashid',
        'phone' => '+966501234567',
        'email' => 'ahmed@example.com'
    ],
    'address' => [
        'street' => 'King Fahd Road',
        'city' => 'Riyadh',
        'district' => 'Al Olaya',
        'building' => 'Tower 5',
        'floor' => '12',
        'apartment' => '1205',
        'coordinates' => [
            'latitude' => 24.7136,
            'longitude' => 46.6753
        ]
    ],
    'timeWindow' => [
        'start' => '2024-01-15T09:00:00Z',
        'end' => '2024-01-15T17:00:00Z'
    ],
    'notes' => 'Please call before delivery',
    'priority' => 'HIGH'
];

// Convert to JSON string
$payload = json_encode($orderData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

// Compute HMAC-SHA256 signature
$signature = hash_hmac('sha256', $payload, $webhookSecret);

echo "Signature: $signature\n";

// Send webhook request
$ch = curl_init("$webhookUrl/$merchantId/orders");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'x-merchant-signature: ' . $signature
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 201) {
    $result = json_decode($response, true);
    echo "Success!\n";
    echo "Order ID: " . $result['orderId'] . "\n";
    echo "Request ID: " . $result['requestId'] . "\n";
} else {
    echo "Error: HTTP $httpCode\n";
    echo "Response: $response\n";
}
?>
```

### Step 3: Handle Responses

#### Success Response (201 Created)

```json
{
  "success": true,
  "orderId": "1234567890123",
  "webhookLogId": "507f1f77bcf86cd799439011",
  "message": "Order received and queued for processing",
  "requestId": "123e4567-e89b-12d3-a456-426614174000"
}
```

#### Error Responses

**Missing Signature (401)**
```json
{
  "error": "MISSING_SIGNATURE",
  "message": "x-merchant-signature header is required",
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "documentation": "https://docs.najahdelivery.com/webhooks/authentication"
}
```

**Invalid Signature (401)**
```json
{
  "error": "INVALID_SIGNATURE",
  "message": "Webhook signature verification failed",
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "hint": "Ensure you are using the correct secret and signing the raw JSON payload"
}
```

**Validation Error (400)**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid webhook payload",
  "details": [
    {
      "field": "customer.phone",
      "message": "\"customer.phone\" is required"
    }
  ],
  "requestId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Rate Limit Exceeded (429)**
```json
{
  "error": "Too many requests",
  "message": "You have exceeded the rate limit. Please try again later.",
  "retryAfter": "900"
}
```

### Step 4: Implement Error Handling

```javascript
async function sendWebhookWithRetry(orderData, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const payload = JSON.stringify(orderData);
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      const response = await axios.post(
        `${webhookUrl}/${merchantId}/orders`,
        orderData,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-merchant-signature': signature
          },
          timeout: 30000 // 30 seconds
        }
      );

      console.log(`Success on attempt ${attempt}:`, response.data);
      return response.data;

    } catch (error) {
      const statusCode = error.response?.status;
      
      // Don't retry client errors (except rate limiting)
      if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
        console.error('Client error, not retrying:', error.response.data);
        throw error;
      }

      // Retry on server errors or rate limiting
      if (attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Attempt ${attempt} failed, retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      } else {
        console.error(`All ${maxRetries} attempts failed`);
        throw error;
      }
    }
  }
}
```

## 📚 API Documentation

### Endpoints

#### POST /webhooks/:merchantId/orders

Create a new order via webhook.

**Headers:**
- `Content-Type`: `application/json`
- `x-merchant-signature`: HMAC-SHA256 signature (required)
- `Accept-Language`: Language preference (optional)

**Path Parameters:**
- `merchantId`: Unique merchant identifier

**Request Body:**
```json
{
  "orderNumber": "ORD-2024-001",
  "items": [...],
  "customer": {...},
  "address": {...},
  "timeWindow": {...},
  "notes": "Optional notes",
  "priority": "MEDIUM",
  "metadata": {}
}
```

See [openapi.yaml](./openapi.yaml) for complete schema documentation.

#### GET /webhooks/:merchantId/logs

Retrieve webhook processing logs.

**Query Parameters:**
- `status`: Filter by status (SUCCESS, FAILED, PENDING)
- `limit`: Records per page (1-100, default: 50)
- `page`: Page number (default: 1)

#### GET /health

Basic health check endpoint.

#### GET /health/ready

Readiness probe for orchestrators.

#### GET /health/live

Liveness probe for orchestrators.

## 🔒 Security

### HMAC Authentication Flow

1. **Shared Secret**: Merchant and service share a secret key
2. **Signature Generation**: Merchant computes `HMAC-SHA256(payload, secret)`
3. **Request Signing**: Signature sent in `x-merchant-signature` header
4. **Verification**: Service recomputes signature and compares
5. **Timing-Safe Comparison**: Prevents timing attacks

### Security Best Practices

- ✅ Store webhook secret securely (environment variables, secrets manager)
- ✅ Use HTTPS in production
- ✅ Implement retry mechanism with exponential backoff
- ✅ Log all webhook attempts for audit trail
- ✅ Monitor for failed authentication attempts
- ✅ Rotate webhook secrets periodically
- ✅ Validate response status codes
- ✅ Set appropriate timeouts

### Rate Limiting

- **Default**: 100 requests per 15 minutes per IP
- **Headers**: `RateLimit-*` headers in responses
- **Retry**: Check `Retry-After` header on 429 responses

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage

# Test HMAC signature generation
node -e "
const crypto = require('crypto');
const payload = JSON.stringify({test: 'data'});
const secret = 'test-secret';
const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
console.log('Signature:', sig);
"
```

### Manual Testing with cURL

```bash
# Generate signature
PAYLOAD='{"orderNumber":"TEST-001","items":[{"sku":"ITEM-001","name":"Test","quantity":1,"price":10}],"customer":{"name":"Test User","phone":"+1234567890"},"address":{"street":"Test St","city":"Riyadh"},"timeWindow":{"start":"2024-01-15T09:00:00Z","end":"2024-01-15T17:00:00Z"}}'

SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "your-webhook-secret" | cut -d' ' -f2)

# Send request
curl -X POST http://localhost:3001/webhooks/merchant_test/orders \
  -H "Content-Type: application/json" \
  -H "x-merchant-signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

## 🚢 Deployment

### Docker

```bash
# Build image
docker build -t najah-ingestion:latest .

# Run container
docker run -d \
  --name najah-ingestion \
  -p 3001:3001 \
  -e MONGODB_URI=mongodb://mongo:27017/najah_ingestion \
  -e WEBHOOK_SECRET=your-secret \
  najah-ingestion:latest
```

### Docker Compose

```yaml
version: '3.8'

services:
  ingestion:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/najah_ingestion
      - WEBHOOK_SECRET=${WEBHOOK_SECRET}
      - EXPRESS_API_URL=http://express-api:3002
    depends_on:
      - mongo
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/health')"]
      interval: 30s
      timeout: 3s
      retries: 3

  mongo:
    image: mongo:7
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ingestion-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ingestion
  template:
    metadata:
      labels:
        app: ingestion
    spec:
      containers:
      - name: ingestion
        image: najah-ingestion:latest
        ports:
        - containerPort: 3001
        env:
        - name: WEBHOOK_SECRET
          valueFrom:
            secretKeyRef:
              name: ingestion-secrets
              key: webhook-secret
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3001
          initialDelaySeconds: 40
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3001
          initialDelaySeconds: 20
          periodSeconds: 10
```

## 📊 Monitoring

### Metrics to Track

- Request rate (requests/second)
- Success rate (successful webhooks / total)
- Average processing time
- Signature validation failures
- Rate limit hits
- Retry attempts
- Database connection status

### Log Format

JSON structured logs for easy parsing:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Webhook processed successfully",
  "service": "ingestion-service",
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "merchantId": "merchant_abc123",
  "orderId": "1234567890123",
  "processingTimeMs": 145
}
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Signature Verification Failed

**Cause**: Mismatch between merchant and service signature computation

**Solutions**:
- Ensure using same secret key
- Sign the exact JSON string (no whitespace differences)
- Use `JSON.stringify()` without formatting
- Check for encoding issues (UTF-8)

**Debug**:
```javascript
// Log what you're signing
console.log('Payload being signed:', payload);
console.log('Payload length:', payload.length);
console.log('Generated signature:', signature);
```

#### 2. Rate Limit Exceeded

**Cause**: Too many requests from same IP

**Solutions**:
- Implement exponential backoff
- Check `Retry-After` header
- Distribute requests across time
- Contact support to increase limits

#### 3. Connection Timeout

**Cause**: Network issues or server overload

**Solutions**:
- Increase timeout (30+ seconds)
- Implement retry logic
- Check network connectivity
- Verify service health

#### 4. Validation Errors

**Cause**: Payload doesn't match expected schema

**Solutions**:
- Review error details in response
- Check required fields
- Validate data types
- Review [openapi.yaml](./openapi.yaml) schema

### Debug Mode

Enable detailed logging:

```bash
LOG_LEVEL=debug npm start
```

## 📞 Support

- **Documentation**: https://docs.najahdelivery.com
- **Email**: support@najahdelivery.com
- **Issue Tracker**: https://github.com/najah-delivery/delivery-os/issues

## 📄 License

MIT License - see [LICENSE](../../LICENSE) file for details.

---

Built with ❤️ by Najah Delivery OS Team

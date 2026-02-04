# Quick Start Guide - Najah Delivery Express API

## Prerequisites
- Node.js >= 18.0.0
- MongoDB >= 5.0
- npm or yarn

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configurations
nano .env
```

## Configuration

Minimal required configuration in `.env`:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/najah_delivery

# JWT
JWT_SECRET=your-secret-key-change-in-production

# Server
PORT=3000
```

## Running

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## API Endpoints

### Base URL
`http://localhost:3000/api/v1`

### Authentication
Include JWT token in requests:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/v1/orders
```

## Example Requests

### Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password"}'
```

### Create Order
```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"merchantId": "ID", "orderNumber": "ORD-001", ...}'
```

## Monitoring

### Health Check
```bash
curl http://localhost:3000/api/v1/health
```

## Support

For details, check:
- README.md - Full documentation
- openapi.yaml - API specification
- IMPLEMENTATION_SUMMARY.md - Technical details

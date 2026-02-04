# Najah Delivery Express API

Express API service for Najah Delivery OS - providing comprehensive delivery management endpoints.

## Features

- 🔐 JWT Authentication & Role-Based Access Control
- 🌍 Bilingual Support (Arabic/English) via i18n middleware
- 📦 Comprehensive Order Management
- 🚚 Courier Tracking & Management
- 🗺️ Route Planning & Optimization
- 🏪 Merchant Management
- 🔍 Real-time Order Tracking
- 🤖 AI Assistant Integration
- 📊 Structured Logging with Winston
- 🛡️ Security Headers with Helmet
- ⚡ Rate Limiting
- 📝 Request ID Tracing

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Validation**: Joi
- **Logging**: Winston
- **Security**: Helmet, CORS, JWT
- **Testing**: Jest, Supertest

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 5.0
- npm or yarn

### Installation

```bash
npm install
```

### Configuration

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
MONGODB_URI=mongodb://localhost:27017/najah_delivery
JWT_SECRET=your-secret-key
PORT=3000
```

### Running the Service

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

### Seeding Database

```bash
npm run seed
```

## API Documentation

See `openapi.yaml` for complete API documentation.

### Main Endpoints

- `GET /api/v1/health` - Health check
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/merchants` - List merchants
- `POST /api/v1/orders` - Create order
- `POST /api/v1/orders/:id/normalize` - Normalize order address
- `GET /api/v1/couriers` - List couriers
- `POST /api/v1/route-plans` - Create route plan
- `POST /api/v1/tracking/update` - Update tracking
- `POST /api/v1/assistant/query` - Query AI assistant

## Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm test -- --coverage
```

## Docker

Build image:
```bash
docker build -t najah-delivery-api .
```

Run container:
```bash
docker run -p 3000:3000 --env-file .env najah-delivery-api
```

## Project Structure

```
├── config/           # Configuration files
│   ├── database.js   # MongoDB connection
│   └── logger.js     # Winston logger setup
├── middleware/       # Custom middleware
│   ├── auth.js       # JWT authentication & authorization
│   ├── i18n.js       # Internationalization
│   ├── requestId.js  # Request ID generation
│   └── errorHandler.js # Central error handling
├── models/           # Mongoose schemas
│   ├── User.js
│   ├── Merchant.js
│   ├── Order.js
│   ├── Courier.js
│   ├── RoutePlan.js
│   ├── WebhookLog.js
│   └── AuditLog.js
├── routes/           # API routes
│   ├── health.js
│   ├── auth.js
│   ├── merchants.js
│   ├── orders.js
│   ├── couriers.js
│   ├── routePlans.js
│   ├── tracking.js
│   └── assistant.js
├── tests/            # Test files
├── scripts/          # Utility scripts
├── server.js         # Main application file
└── package.json
```

## Security

- Helmet for security headers
- CORS configuration
- Rate limiting
- JWT token authentication
- Role-based access control
- Input validation with Joi
- MongoDB injection prevention

## License

MIT

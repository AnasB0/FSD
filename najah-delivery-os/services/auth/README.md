# Auth Service - Najah Delivery OS

Authentication and authorization microservice for Najah Delivery OS platform.

## Features

- 🔐 **JWT Authentication** - Access and refresh token mechanism
- 👥 **User Management** - Register, login, logout functionality
- 🔒 **Role-Based Access** - ADMIN, MERCHANT, DRIVER roles
- 🌍 **i18n Support** - Arabic (ar) and English (en) via Accept-Language header
- 📊 **Session Tracking** - MongoDB-based session management
- 🛡️ **Security** - Helmet, CORS, rate limiting, bcrypt hashing
- 📝 **Structured Logging** - Winston JSON logging with request IDs
- 🚀 **Production Ready** - Multi-stage Docker build with health checks
- 📚 **API Documentation** - OpenAPI 3.0 specification
- ✅ **Testing** - Comprehensive Jest test suite

## Tech Stack

- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Validation**: Joi
- **Logging**: Winston + Morgan
- **Security**: Helmet, CORS, express-rate-limit
- **Testing**: Jest + Supertest

## Project Structure

```
auth/
├── index.js                 # Main application entry point
├── package.json             # Dependencies and scripts
├── Dockerfile               # Multi-stage Docker build
├── openapi.yaml             # API specification
├── .env.example             # Environment variables template
├── models/
│   ├── User.js              # User schema (username, email, role, etc.)
│   └── Session.js           # Session schema (refresh tokens)
├── routes/
│   ├── health.js            # Health check endpoint
│   └── auth.js              # Auth endpoints (register, login, etc.)
├── middleware/
│   ├── auth.js              # JWT verification middleware
│   ├── i18n.js              # Language detection middleware
│   ├── requestId.js         # Request ID generation
│   └── errorHandler.js      # Centralized error handling
├── utils/
│   ├── jwt.js               # JWT token generation/verification
│   └── password.js          # Password hashing utilities
└── tests/
    └── auth.test.js         # Jest test suite
```

## Prerequisites

- Node.js 18+
- MongoDB 6.0+
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   cd /home/runner/work/FSD/FSD/najah-delivery-os/services/auth
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` file** with your configuration:
   ```env
   PORT=3001
   MONGODB_URI=mongodb://localhost:27017/najah-delivery-auth
   JWT_ACCESS_SECRET=your-secret-key
   JWT_REFRESH_SECRET=your-refresh-secret
   CORS_ORIGIN=http://localhost:3000
   ```

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Run Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

## Docker

### Build Image
```bash
docker build -t najah-auth-service .
```

### Run Container
```bash
docker run -d \
  -p 3001:3001 \
  -e MONGODB_URI=mongodb://mongo:27017/najah-delivery-auth \
  -e JWT_ACCESS_SECRET=your-secret \
  -e JWT_REFRESH_SECRET=your-refresh-secret \
  --name auth-service \
  najah-auth-service
```

## API Endpoints

### Health Check
```http
GET /health
```

### Authentication Endpoints

#### Register
```http
POST /auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "role": "DRIVER",
  "merchantId": "merchant-123"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

#### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Get Current User
```http
GET /auth/me
Authorization: Bearer {accessToken}
```

## Internationalization (i18n)

The service supports Arabic and English. Set the `Accept-Language` header:

```http
Accept-Language: ar
```
or
```http
Accept-Language: en
```

Response messages will be returned in the specified language.

## Security Features

- **Helmet**: Security headers
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: 100 requests per 15 minutes (configurable)
- **bcrypt**: Password hashing with configurable salt rounds
- **JWT**: Token-based authentication with access and refresh tokens
- **Request ID**: UUID-based request tracking

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/najah-delivery-auth` |
| `JWT_ACCESS_SECRET` | JWT access token secret | Required |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | Required |
| `JWT_ACCESS_EXPIRY` | Access token expiry | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token expiry | `7d` |
| `BCRYPT_SALT_ROUNDS` | Bcrypt salt rounds | `10` |
| `CORS_ORIGIN` | Allowed CORS origin | `*` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

## User Roles

- **ADMIN**: Full system access
- **MERCHANT**: Merchant portal access
- **DRIVER**: Driver app access

## Session Management

- Refresh tokens are stored in MongoDB with expiration
- Each session tracks IP address and user agent
- Sessions are automatically cleaned up via TTL index
- Token refresh rotates the refresh token for security

## Error Handling

All errors return JSON with:
```json
{
  "success": false,
  "message": "Error description",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Logging

JSON-formatted logs include:
- Request ID
- HTTP method and URL
- Status code
- Response time
- User agent
- IP address

## Testing

The test suite covers:
- User registration (success, duplicate, validation)
- User login (success, invalid credentials)
- Token refresh (success, invalid token)
- Logout (success, unauthorized)
- Get current user (success, unauthorized)
- Health check

Run tests with coverage:
```bash
npm test
```

## API Documentation

Full OpenAPI 3.0 specification is available in `openapi.yaml`. You can view it using:
- [Swagger Editor](https://editor.swagger.io/)
- [Redoc](https://github.com/Redocly/redoc)
- Swagger UI

## License

MIT

## Support

For issues and questions, please contact the Najah Delivery team.

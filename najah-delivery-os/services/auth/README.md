# Najah Delivery OS - Auth Service

JWT Authentication Microservice for the Najah Delivery OS platform.

## Features

- **User Registration** - Create new user accounts with role-based access
- **User Login** - Authenticate users with email/password
- **JWT Tokens** - Access and refresh token generation
- **Session Management** - Track and manage user sessions
- **Role-Based Access** - Support for admin, merchant, driver, and customer roles
- **Password Security** - Bcrypt password hashing with 10 rounds
- **Rate Limiting** - Protect against brute force attacks
- **i18n Support** - Multi-language support (English/Arabic)
- **Health Checks** - Built-in health monitoring endpoint

## Tech Stack

- **Node.js** 18+ with Express 4.18
- **MongoDB** with Mongoose 8.0
- **JWT** for authentication
- **Bcrypt** for password hashing
- **Joi** for request validation
- **Winston** for logging
- **Jest** for testing

## Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env
```

## Configuration

Edit `.env` file with your settings:

```env
AUTH_PORT=8081
MONGO_URI=mongodb://localhost:27017/najah-auth
JWT_ACCESS_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
CORS_ORIGIN=*
```

## Usage

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start

# Run tests
npm test

# Run tests with coverage
npm run test
```

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user
- `GET /auth/me` - Get current user info (requires auth)

## API Documentation

OpenAPI 3.0 specification available in `openapi.yaml`

## Docker

```bash
# Build image
docker build -t najah-auth-service .

# Run container
docker run -p 8081:8081 --env-file .env najah-auth-service
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Project Structure

```
auth/
├── index.js              # Main server file
├── package.json          # Dependencies
├── Dockerfile            # Docker configuration
├── openapi.yaml          # API documentation
├── .env.example          # Environment template
├── models/
│   ├── User.js          # User model
│   └── Session.js       # Session model
├── middleware/
│   ├── auth.js          # JWT verification middleware
│   └── i18n.js          # Internationalization
├── routes/
│   └── auth.js          # Auth routes
├── utils/
│   └── logger.js        # Winston logger
├── tests/
│   └── auth.test.js     # Test suite
└── logs/                # Log files
```

## Security Features

- Bcrypt password hashing (10 rounds)
- JWT access/refresh token pattern
- Session tracking and management
- Rate limiting (100 requests per 15 minutes)
- Helmet security headers
- CORS protection
- Request validation with Joi

## User Roles

- **admin** - Full system access
- **merchant** - Restaurant/store owner
- **driver** - Delivery driver
- **customer** - End user

## License

MIT

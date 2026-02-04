# Driver App

React-based mobile application for delivery drivers to manage their routes and deliveries.

## Features

- **Authentication**: Secure login for drivers with JWT tokens
- **Multi-language Support**: Arabic (primary) and English
- **Route Management**: View assigned delivery routes
- **Real-time Location Tracking**: Automatic location updates every 30 seconds during active deliveries
- **Delivery Status Updates**: Mark deliveries as in progress, completed, or failed
- **Responsive Design**: Optimized for mobile devices
- **Offline-ready**: Service worker support (future enhancement)

## Tech Stack

- **React 18**: UI framework
- **Vite**: Build tool and dev server
- **React Router**: Client-side routing
- **i18next**: Internationalization
- **Axios**: HTTP client
- **Nginx**: Production web server

## Project Structure

```
driver-app/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── Header.jsx
│   │   ├── RouteMap.jsx
│   │   └── DeliveryCard.jsx
│   ├── pages/            # Page components
│   │   ├── Login.jsx
│   │   └── MyRoute.jsx
│   ├── services/         # API and utility services
│   │   ├── api.js
│   │   └── location.js
│   ├── i18n/             # Internationalization
│   │   ├── index.js
│   │   └── locales/
│   │       ├── ar.json
│   │       └── en.json
│   ├── App.jsx           # Main app component
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles
├── Dockerfile            # Multi-stage build
├── nginx.conf            # Production server config
├── vite.config.js        # Vite configuration
└── package.json          # Dependencies
```

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Environment Variables

Create a `.env` file:

```env
VITE_API_URL=/api
```

### API Proxy

In development, Vite proxies `/api/*` requests to `http://express-api:8080`

## Building

### Development Build

```bash
npm run build
```

### Docker Build

```bash
docker build -t driver-app:latest .
```

### Run with Docker

```bash
docker run -p 80:80 driver-app:latest
```

## Location Tracking

The app automatically tracks driver location when a route is in progress:

- **Frequency**: Every 30 seconds
- **Method**: Browser Geolocation API
- **Endpoint**: `POST /api/tracking/update`
- **Payload**: 
  ```json
  {
    "latitude": 31.9634,
    "longitude": 35.9307,
    "timestamp": "2024-01-01T10:00:00.000Z"
  }
  ```

Location tracking starts when:
- Driver has an active route
- Route status is `in_progress`

Location tracking stops when:
- Driver logs out
- Route is completed
- App is closed

## Authentication

JWT tokens are stored in `localStorage`:
- **Key**: `driver_token`
- **Header**: `Authorization: Bearer <token>`
- **Auto-redirect**: Redirects to login on 401 responses

## API Endpoints

### Authentication
- `POST /api/auth/login` - Driver login

### Routes
- `GET /api/routes/my-route` - Get assigned route

### Deliveries
- `PUT /api/deliveries/:id/status` - Update delivery status

### Tracking
- `POST /api/tracking/update` - Send location update

## Internationalization

Supported languages:
- Arabic (ar) - Default
- English (en)

Language selection is persisted in `localStorage`.

## Deployment

### Production Build

The app uses a multi-stage Docker build:

1. **Build Stage**: Compiles React app with Vite
2. **Production Stage**: Serves static files with Nginx

### Nginx Features

- SPA routing support
- API proxy to Express backend
- Gzip compression
- Static asset caching (1 year)
- Security headers
- Health check endpoint at `/health`

### Health Check

```bash
curl http://localhost/health
# Returns: OK
```

## Browser Support

- Modern browsers with ES6+ support
- Geolocation API required for location tracking
- localStorage required for authentication

## Security

- JWT token authentication
- HTTPS recommended for production
- Security headers configured in Nginx
- XSS protection enabled
- Content Security Policy (CSP) ready

## Performance

- Code splitting with React lazy loading
- Optimized production builds
- Static asset caching
- Gzip compression
- Minimal bundle size

## Future Enhancements

- Service worker for offline support
- Push notifications for new deliveries
- Camera integration for proof of delivery
- Turn-by-turn navigation
- Route optimization suggestions
- Performance metrics tracking
- Chat with customer support

## License

Proprietary - Najah Delivery OS

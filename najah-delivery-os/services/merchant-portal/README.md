# Merchant Portal - Najah Delivery OS

React-based web application for merchants to manage orders, track deliveries, optimize routes, and interact with an AI assistant.

## Features

- **Dashboard**: Overview of orders, drivers, and delivery statistics
- **Orders Management**: View, assign, and track orders in real-time
- **Route Planning**: View and optimize delivery routes with interactive maps
- **AI Assistant**: Chat interface for natural language queries and assistance
- **Multi-language Support**: Arabic (primary) and English
- **Interactive Maps**: Mapbox GL integration for visualizing routes and locations

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **i18next** - Internationalization (Arabic/English)
- **Axios** - HTTP client for API communication
- **Mapbox GL** - Interactive maps and route visualization

## Prerequisites

- Node.js 20+
- npm or yarn
- Mapbox API token (for maps)

## Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env and add your Mapbox token
# VITE_MAPBOX_TOKEN=your_token_here
```

## Development

```bash
# Start development server
npm run dev

# Server will start on http://localhost:3000
```

The dev server includes API proxy configuration that forwards `/api/*` requests to `http://express-api:8080`.

## Building for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

The build output will be in the `dist/` directory.

## Docker Deployment

```bash
# Build Docker image
docker build -t merchant-portal .

# Run container
docker run -p 80:80 merchant-portal
```

The Docker image uses a multi-stage build:
1. **Build stage**: Compiles the React app with Vite
2. **Production stage**: Serves static files with Nginx

## Project Structure

```
merchant-portal/
├── src/
│   ├── components/        # Reusable React components
│   │   ├── Header.jsx     # Navigation header
│   │   ├── Map.jsx        # Mapbox GL map component
│   │   └── OrderList.jsx  # Orders table component
│   ├── pages/             # Route pages
│   │   ├── Login.jsx      # Authentication page
│   │   ├── Dashboard.jsx  # Main dashboard
│   │   ├── Orders.jsx     # Orders management
│   │   ├── RoutePlans.jsx # Route planning
│   │   └── Assistant.jsx  # AI chat assistant
│   ├── services/          # API services
│   │   └── api.js         # Axios instance and API calls
│   ├── i18n/              # Internationalization
│   │   ├── index.js       # i18n configuration
│   │   └── locales/       # Translation files
│   │       ├── ar.json    # Arabic translations
│   │       └── en.json    # English translations
│   ├── styles/
│   │   └── App.css        # Global styles
│   ├── App.jsx            # Main app component with routing
│   └── main.jsx           # Application entry point
├── public/                # Static assets
├── Dockerfile             # Multi-stage Docker build
├── nginx.conf             # Nginx configuration
├── vite.config.js         # Vite configuration
└── package.json           # Dependencies and scripts
```

## API Integration

The application communicates with the Express API backend through axios. All API calls include:

- JWT authentication (Bearer token)
- Automatic token refresh
- Error handling and retry logic
- Request/response interceptors

### API Endpoints

- `POST /api/auth/login` - User authentication
- `GET /api/orders` - List all orders
- `POST /api/orders/:id/assign` - Assign driver to order
- `GET /api/routes` - List route plans
- `POST /api/routes/optimize` - Optimize a route
- `POST /api/assistant/chat` - Chat with AI assistant
- `GET /api/stats/dashboard` - Dashboard statistics

## Configuration

### Environment Variables

- `VITE_API_URL` - API base URL (default: `/api`)
- `VITE_MAPBOX_TOKEN` - Mapbox access token for maps

### Nginx Proxy

The nginx configuration proxies `/api/*` requests to the Express API service, enabling seamless API communication in production.

## Authentication

The app uses JWT token-based authentication:

1. User logs in via `/login`
2. Token stored in `localStorage`
3. Token included in all API requests via axios interceptor
4. Automatic redirect to login on 401 responses

## Internationalization

The app supports Arabic (default) and English:

- Language toggle in header
- RTL support for Arabic
- Translations in `src/i18n/locales/`
- Language preference saved in `localStorage`

## Map Integration

Mapbox GL provides interactive maps for:

- Delivery location visualization
- Route planning and optimization
- Real-time driver tracking
- Default center: Riyadh, Saudi Arabia (24.7136°N, 46.6753°E)

## License

Proprietary - Najah Delivery OS

# Najah Delivery - Merchant Portal

React + Vite frontend application for the Najah Delivery merchant portal with i18n support, Mapbox GL integration, and AI assistant.

## Features

- 🔐 Authentication with JWT
- 📊 Dashboard with statistics
- 📦 Order management
- 🗺️ Route planning with Mapbox GL
- 🤖 RAG-powered AI assistant
- 🌍 Internationalization (English/Arabic) with RTL support
- 📱 Responsive design

## Prerequisites

- Node.js 18+
- npm or yarn
- Mapbox access token

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Mapbox token:
   ```
   VITE_MAPBOX_TOKEN=your_mapbox_token_here
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```
   Application will be available at `http://localhost:3000`

4. **Build for production:**
   ```bash
   npm run build
   ```

## Docker

Build and run with Docker:

```bash
docker build -t merchant-portal .
docker run -p 3000:3000 merchant-portal
```

## Project Structure

```
merchant-portal/
├── src/
│   ├── api/
│   │   └── client.js          # Axios client with interceptors
│   ├── components/
│   │   ├── Layout.jsx         # Main layout with navigation
│   │   └── Map.jsx            # Mapbox GL wrapper component
│   ├── pages/
│   │   ├── Login.jsx          # Login page
│   │   ├── Dashboard.jsx      # Dashboard with stats
│   │   ├── Orders.jsx         # Orders management
│   │   ├── RoutePlans.jsx     # Route planning view
│   │   └── Assistant.jsx      # AI assistant chat
│   ├── styles/
│   │   └── app.css            # Global styles
│   ├── i18n.js                # i18next configuration
│   ├── App.jsx                # Main app component with routing
│   └── main.jsx               # React entry point
├── index.html                 # HTML entry point
├── vite.config.js             # Vite configuration
├── package.json               # Dependencies
├── Dockerfile                 # Multi-stage Docker build
└── nginx.conf                 # Nginx configuration
```

## API Endpoints

The application expects the following API endpoints:

- `POST /api/auth/login` - User authentication
- `GET /api/stats` - Dashboard statistics
- `GET /api/orders` - List orders
- `POST /api/orders/:id/normalize` - Normalize order address
- `POST /api/orders/:id/plan-route` - Create route plan
- `GET /api/route-plans` - List route plans
- `POST /api/assistant/query` - Query AI assistant

## Internationalization

The app supports English and Arabic with RTL support. Language can be toggled via the UI.

Translations are defined in `src/i18n.js`.

## Technologies

- **React 18.2** - UI library
- **Vite 5.0** - Build tool
- **React Router 6.20** - Routing
- **Axios 1.6** - HTTP client
- **i18next 23.7** - Internationalization
- **Mapbox GL 3.0** - Maps and routing visualization
- **Nginx** - Production web server

## Development

- Hot module replacement enabled in dev mode
- API proxy configured to forward `/api` requests to backend
- ESLint and Prettier recommended for code formatting

## License

MIT

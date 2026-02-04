# Driver App

A simplified React + Vite application for delivery drivers to manage their routes and send location updates.

## Features

- Driver authentication
- View assigned delivery routes
- Mark orders as delivered
- Automatic location tracking (every 30 seconds)
- Mobile-first responsive design
- Multi-language support (English/Arabic)

## Prerequisites

- Node.js 18+
- npm or yarn

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3001`

## Build

```bash
npm run build
```

## Docker

Build the Docker image:
```bash
docker build -t driver-app .
```

Run the container:
```bash
docker run -p 3001:3001 driver-app
```

## API Endpoints

The app interacts with the following API endpoints:

- `POST /api/auth/login` - Driver login
- `GET /api/couriers/me/route` - Get assigned route
- `POST /api/tracking/update` - Send location update
- `PATCH /api/orders/:id/status` - Update order status

## Location Tracking

The app automatically:
- Requests browser geolocation permission
- Sends location updates every 30 seconds
- Uses navigator.geolocation API

## Environment Variables

- `VITE_API_BASE_URL` - API base URL (default: `/api`)

## Project Structure

```
driver-app/
├── src/
│   ├── api/
│   │   └── client.js          # Axios client with JWT
│   ├── components/
│   │   └── OrderCard.jsx      # Order display component
│   ├── pages/
│   │   ├── Login.jsx          # Login page
│   │   └── MyRoute.jsx        # Route management page
│   ├── styles/
│   │   └── app.css            # Global styles
│   ├── App.jsx                # Main app component
│   ├── i18n.js                # i18next configuration
│   └── main.jsx               # Entry point
├── index.html
├── vite.config.js
├── package.json
├── Dockerfile
├── nginx.conf
└── README.md
```

## Technologies

- React 18.2
- Vite 5.0
- React Router 6.20
- Axios 1.6
- i18next 23.7
- react-i18next 14.0

## License

MIT

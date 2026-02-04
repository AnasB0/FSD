# Optimizer Service

Route optimization service for Najah Delivery OS using nearest-available heuristic algorithm.

## Features

- Assigns orders to couriers based on proximity
- Considers courier capacity and time windows
- Uses OSRM for accurate distance/duration calculations
- Falls back to haversine distance when OSRM unavailable
- RESTful API with structured logging

## Setup

### Local Development

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:
```
OSRM_BASE_URL=http://router.project-osrm.org
FLASK_PORT=5003
FLASK_ENV=development
```

4. Run the service:
```bash
python app.py
```

### Docker

Build and run with Docker:
```bash
docker build -t optimizer-service .
docker run -p 5003:5003 --env-file .env optimizer-service
```

## API Usage

### Health Check

```bash
curl http://localhost:5003/health
```

Response:
```json
{
  "status": "healthy",
  "service": "optimizer",
  "version": "1.0.0"
}
```

### Optimize Deliveries

```bash
curl -X POST http://localhost:5003/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "orders": [
      {
        "id": "order1",
        "location": {"lat": 31.9539, "lng": 35.9106},
        "timeWindow": {"start": "09:00", "end": "12:00"}
      },
      {
        "id": "order2",
        "location": {"lat": 31.9612, "lng": 35.9450},
        "timeWindow": {"start": "10:00", "end": "14:00"}
      }
    ],
    "couriers": [
      {
        "id": "courier1",
        "location": {"lat": 31.9522, "lng": 35.9330},
        "capacity": 5,
        "shift": {"start": "08:00", "end": "16:00"}
      },
      {
        "id": "courier2",
        "location": {"lat": 31.9580, "lng": 35.9200},
        "capacity": 3,
        "shift": {"start": "09:00", "end": "17:00"}
      }
    ]
  }'
```

Response:
```json
{
  "assignments": [
    {
      "courierId": "courier1",
      "orderIds": ["order1"],
      "route": [
        {"lat": 31.9522, "lng": 35.9330},
        {"lat": 31.9539, "lng": 35.9106}
      ],
      "totalDistance": 2450.5,
      "totalDuration": 294.06,
      "eta": "2024-01-15T09:15:30.123456"
    },
    {
      "courierId": "courier2",
      "orderIds": ["order2"],
      "route": [
        {"lat": 31.9580, "lng": 35.9200},
        {"lat": 31.9612, "lng": 35.9450}
      ],
      "totalDistance": 1850.2,
      "totalDuration": 222.02,
      "eta": "2024-01-15T09:12:15.987654"
    }
  ],
  "summary": {
    "totalOrders": 2,
    "totalCouriers": 2,
    "assignedOrders": 2,
    "activeCouriers": 2
  }
}
```

## Algorithm

The service uses a simple nearest-available heuristic:

1. **Sort Orders**: Orders are sorted by time window (earliest first)
2. **Distance Calculation**: Uses OSRM table API for accurate routing, falls back to haversine
3. **Assignment**: Each order is assigned to the nearest courier with available capacity
4. **Route Building**: Courier routes are built incrementally as orders are assigned
5. **ETA Calculation**: Estimates delivery time based on distance and average speed

### Constraints Considered

- **Capacity**: Couriers cannot exceed their capacity limit
- **Time Windows**: Orders are prioritized by their time windows
- **Distance**: Orders are assigned to the nearest available courier

## Testing

Run tests:
```bash
pytest tests/
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OSRM_BASE_URL` | OSRM routing service URL | `http://router.project-osrm.org` |
| `FLASK_PORT` | Port to run the service | `5003` |
| `FLASK_ENV` | Environment mode | `production` |

## Architecture

```
optimizer/
├── app.py              # Flask application and routes
├── optimizer.py        # Core optimization logic
├── utils/
│   ├── osrm.py        # OSRM API integration
│   └── haversine.py   # Distance calculation fallback
├── tests/             # Test suite
├── requirements.txt   # Python dependencies
├── Dockerfile        # Container configuration
└── README.md         # This file
```

## Future Enhancements

- Multi-stop route optimization (TSP/VRP algorithms)
- Real-time traffic integration
- Dynamic reoptimization
- Advanced constraints (vehicle types, special requirements)
- Machine learning for demand prediction

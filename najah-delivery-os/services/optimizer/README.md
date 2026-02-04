# Optimizer Service

A Python Flask-based microservice for optimizing delivery routes using heuristic VRP (Vehicle Routing Problem) algorithms with OSRM integration.

## Features

- **Route Optimization**: Nearest neighbor heuristic for efficient order-to-courier assignment
- **OSRM Integration**: Real-world distance and duration calculations using OSRM routing engine
- **Fallback Mechanism**: Haversine distance calculation when OSRM is unavailable
- **Constraints Support**: 
  - Maximum orders per route
  - Maximum route duration
  - Courier capacity
  - Order priority levels
- **RESTful API**: Simple HTTP endpoints for health checks and optimization requests

## API Endpoints

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "optimizer",
  "version": "1.0.0"
}
```

### Optimize Routes

```http
POST /optimize
Content-Type: application/json
```

**Request Body:**
```json
{
  "orders": [
    {
      "orderId": "order123",
      "deliveryLocation": {
        "latitude": 31.9522,
        "longitude": 35.2332
      },
      "priority": "high",
      "timeWindow": "2024-01-15T10:00:00Z",
      "serviceTime": 5
    }
  ],
  "couriers": [
    {
      "courierId": "courier456",
      "currentLocation": {
        "latitude": 31.9550,
        "longitude": 35.2350
      },
      "available": true,
      "capacity": 10
    }
  ]
}
```

**Response:**
```json
{
  "routes": [
    {
      "courierId": "courier456",
      "orders": ["order123"],
      "totalDistance": 2.5,
      "totalDuration": 8.3,
      "estimatedTimes": [
        {
          "orderId": "order123",
          "eta": 5.2
        }
      ]
    }
  ],
  "totalRoutes": 1,
  "totalOrders": 1
}
```

## Installation

### Using Python

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run the service:
```bash
python app.py
```

Or with Gunicorn:
```bash
gunicorn app:app --bind 0.0.0.0:5001
```

### Using Docker

1. Build the image:
```bash
docker build -t optimizer-service .
```

2. Run the container:
```bash
docker run -p 5001:5001 \
  -e OSRM_BASE_URL=http://router.project-osrm.org \
  -e MAX_ORDERS_PER_ROUTE=10 \
  optimizer-service
```

## Configuration

All configuration is done through environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `OPTIMIZER_PORT` | Service port | `5001` |
| `OSRM_BASE_URL` | OSRM routing service URL | `http://router.project-osrm.org` |
| `MAX_ORDERS_PER_ROUTE` | Maximum orders per courier | `10` |
| `MAX_ROUTE_DURATION_HOURS` | Maximum route duration | `8` |
| `DEFAULT_SERVICE_TIME_MINUTES` | Default service time per stop | `5` |
| `FLASK_DEBUG` | Enable Flask debug mode | `False` |

## Algorithm

The optimizer uses a **nearest neighbor heuristic** for route assignment:

1. **Initialization**: Create empty routes for all available couriers
2. **Assignment Loop**:
   - For each unassigned order, find the nearest available courier
   - Consider constraints: capacity, duration, priority
   - Assign order to the best courier
   - Update route metrics (distance, duration, ETA)
3. **Optimization**: Priority orders get preference (weighted distance)
4. **Output**: Return optimized routes with complete metrics

### Distance Calculation

- **Primary**: OSRM routing engine for real-world road distances
- **Fallback**: Haversine formula for great-circle distances

## Testing

Run tests with pytest:

```bash
pytest tests/test_optimizer.py -v
```

Run with coverage:

```bash
pytest tests/test_optimizer.py --cov=. --cov-report=html
```

## Development

### Project Structure

```
optimizer/
├── app.py                 # Flask application
├── optimizer.py           # Core optimization logic
├── osrm_client.py        # OSRM client implementation
├── utils.py              # Helper functions
├── config.py             # Configuration management
├── requirements.txt      # Python dependencies
├── Dockerfile           # Container configuration
├── .env.example         # Environment template
├── README.md            # Documentation
└── tests/
    └── test_optimizer.py # Test suite
```

### Code Style

- Follows PEP 8 style guide
- Uses type hints for all functions
- Includes docstrings for all modules and functions
- Error handling with try-except blocks
- Logging for debugging and monitoring

## Performance

- **Average optimization time**: 100-500ms for 50 orders and 10 couriers
- **OSRM timeout**: 10 seconds
- **Fallback calculation**: Instant (pure Python math)
- **Memory usage**: ~50-100MB per worker

## Limitations

- **Algorithm**: Nearest neighbor is a greedy heuristic (not optimal)
- **Scalability**: O(n²) complexity for n orders
- **Real-time**: Not designed for sub-second latency
- **Features**: No support for:
  - Multi-depot scenarios
  - Vehicle types/constraints
  - Traffic conditions
  - Dynamic re-optimization

## Future Improvements

- [ ] Implement 2-opt or 3-opt local search
- [ ] Add genetic algorithm for larger problem sets
- [ ] Support time window constraints
- [ ] Vehicle capacity constraints (weight/volume)
- [ ] Real-time traffic integration
- [ ] Pickup and delivery scenarios
- [ ] Multi-objective optimization

## License

MIT License - See LICENSE file for details

## Support

For issues and questions, please open an issue on the repository.

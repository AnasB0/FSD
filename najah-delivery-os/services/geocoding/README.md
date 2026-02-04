# Geocoding Service

A Python Flask microservice for normalizing and geocoding Arabic and English addresses using the Nominatim API.

## Features

- **Address Normalization**: Parse and structure Arabic and English addresses
- **Geocoding**: Convert addresses to latitude/longitude coordinates
- **Reverse Geocoding**: Convert coordinates back to address components
- **Fallback Handling**: Provide city center coordinates when geocoding fails
- **Bilingual Support**: Handle both Arabic and English address formats
- **Saudi Arabia Focus**: Optimized for Saudi Arabian address patterns

## Requirements

- Python 3.11+
- Flask 3.0
- requests 2.31
- python-dotenv 1.0
- gunicorn 21.2 (for production)
- pytest 7.4 (for testing)

## Installation

1. Clone the repository and navigate to the service directory:
```bash
cd najah-delivery-os/services/geocoding
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file from the example:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env` as needed.

## Configuration

Environment variables (see `.env.example`):

- `GEOCODING_PORT`: Port number for the service (default: 5002)
- `NOMINATIM_BASE_URL`: Nominatim API base URL (default: https://nominatim.openstreetmap.org)
- `GEOCODING_TIMEOUT_SECONDS`: API request timeout (default: 10)
- `DEFAULT_COUNTRY`: Default country code (default: SA)
- `DEFAULT_CITY`: Default city for fallbacks (default: Riyadh)

## Running the Service

### Development Mode

```bash
python app.py
```

### Production Mode

```bash
gunicorn app:app --bind 0.0.0.0:5002 --workers 4
```

### Docker

Build the image:
```bash
docker build -t geocoding-service .
```

Run the container:
```bash
docker run -p 5002:5002 --env-file .env geocoding-service
```

## API Endpoints

### Health Check

**GET** `/health`

Check if the service is running.

**Response:**
```json
{
  "status": "healthy",
  "service": "geocoding"
}
```

### Normalize and Geocode Address

**POST** `/normalize`

Normalize an address and convert it to coordinates.

**Request Body:**
```json
{
  "ar": "شارع الملك فهد، حي العليا، الرياض 12345",
  "en": "King Fahd Road, Al Olaya, Riyadh, 12345",
  "components": {
    "street": "King Fahd Road",
    "district": "Al Olaya",
    "city": "Riyadh",
    "postal_code": "12345"
  },
  "country": "SA"
}
```

**Note**: At least one of `ar`, `en`, or `components` must be provided.

**Response:**
```json
{
  "normalized_address": {
    "street": "King Fahd Road",
    "district": "Al Olaya",
    "city": "Riyadh",
    "postal_code": "12345"
  },
  "coordinates": {
    "latitude": 24.7136,
    "longitude": 46.6753
  },
  "fallback": false
}
```

### Reverse Geocode

**POST** `/reverse`

Convert coordinates to address components.

**Request Body:**
```json
{
  "latitude": 24.7136,
  "longitude": 46.6753
}
```

**Response:**
```json
{
  "address": {
    "street": "King Fahd Road",
    "district": "Al Olaya",
    "city": "Riyadh",
    "postal_code": "12345"
  }
}
```

## Examples

### Example 1: Geocode Arabic Address

```bash
curl -X POST http://localhost:5002/normalize \
  -H "Content-Type: application/json" \
  -d '{
    "ar": "شارع التحلية، حي السليمانية، جدة 21465"
  }'
```

### Example 2: Geocode English Address

```bash
curl -X POST http://localhost:5002/normalize \
  -H "Content-Type: application/json" \
  -d '{
    "en": "King Abdullah Road, Al Khobar"
  }'
```

### Example 3: Using Pre-Parsed Components

```bash
curl -X POST http://localhost:5002/normalize \
  -H "Content-Type: application/json" \
  -d '{
    "components": {
      "street": "Prince Mohammed Bin Abdulaziz Street",
      "city": "Dammam"
    }
  }'
```

### Example 4: Reverse Geocoding

```bash
curl -X POST http://localhost:5002/reverse \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 21.5433,
    "longitude": 39.1728
  }'
```

## Testing

Run the test suite:

```bash
pytest tests/ -v
```

Run tests with coverage:

```bash
pytest tests/ --cov=. --cov-report=html
```

## Project Structure

```
geocoding/
├── app.py                          # Flask application with routes
├── config.py                       # Configuration management
├── normalizer.py                   # Address normalization logic
├── geocode.py                      # Nominatim API integration
├── utils.py                        # Utility functions
├── requirements.txt                # Python dependencies
├── Dockerfile                      # Docker configuration
├── .env.example                    # Environment variables template
├── README.md                       # This file
├── tests/
│   └── test_geocoding.py          # Unit tests
└── prompts/
    └── address_normalization.md   # Parsing guidelines and examples
```

## Address Parsing

The service can parse both Arabic and English addresses using pattern matching and heuristics.

### Arabic Address Patterns

- `شارع [name]` → Street
- `حي [name]` → District
- City names: `الرياض`, `جدة`, `مكة`, etc.

### English Address Patterns

- `[name] Street/Road/Avenue` → Street
- `[name] District/Neighborhood` → District
- City names: `Riyadh`, `Jeddah`, `Mecca`, etc.

See `prompts/address_normalization.md` for detailed parsing guidelines.

## Fallback Behavior

When geocoding fails, the service returns city center coordinates:

- **Riyadh**: (24.7136, 46.6753)
- **Jeddah**: (21.5433, 39.1728)
- **Dammam**: (26.4207, 50.0888)
- **Mecca**: (21.4225, 39.8262)
- **Medina**: (24.5247, 39.5692)

The response includes `"fallback": true` when city center coordinates are used.

## Error Handling

The service returns appropriate HTTP status codes:

- **200**: Success
- **400**: Bad request (missing or invalid parameters)
- **404**: Resource not found (reverse geocoding failed)
- **405**: Method not allowed
- **500**: Internal server error

## Rate Limiting

When using the public Nominatim API, be aware of rate limits:
- Maximum 1 request per second
- Include proper User-Agent header (automatically handled)

Consider using a private Nominatim instance for production use.

## Contributing

1. Follow PEP 8 style guidelines
2. Add type hints to all functions
3. Write docstrings for all public functions
4. Add unit tests for new functionality
5. Update documentation as needed

## License

[Add your license information here]

## Contact

[Add contact information here]

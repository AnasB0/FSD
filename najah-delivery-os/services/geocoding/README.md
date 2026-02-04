# Geocoding Service

Address normalization and geocoding service for Najah Delivery OS, with specialized support for Arabic addresses in Saudi Arabia.

## Features

- **Address Normalization**: Parse and standardize Arabic and English addresses
- **Geocoding**: Convert addresses to coordinates using Nominatim API
- **Reverse Geocoding**: Convert coordinates back to addresses
- **Arabic Support**: Native handling of Arabic street names, districts, and cities
- **KSA Focus**: Built-in support for major Saudi Arabian cities
- **Rate Limiting**: Respects Nominatim usage policy
- **Fallback**: Returns Riyadh city center for unresolvable addresses

## Supported Cities

The service has built-in support for major KSA cities:

| Arabic | English |
|--------|---------|
| الرياض | Riyadh |
| جدة | Jeddah |
| الدمام | Dammam |
| مكة / مكة المكرمة | Mecca |
| المدينة / المدينة المنورة | Medina |

## API Endpoints

### Health Check
```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "geocoding",
  "version": "1.0.0"
}
```

### Normalize Address
```http
POST /normalize
```

Request with bilingual address:
```json
{
  "address": {
    "ar": "شارع الملك فهد، حي العليا، الرياض 12345",
    "en": "King Fahd Street, Al Olaya, Riyadh"
  }
}
```

Request with single language:
```json
{
  "address": "شارع الملك فهد، حي العليا، الرياض"
}
```

Response:
```json
{
  "normalized": {
    "street": "الملك فهد",
    "district": "العليا",
    "city": "Riyadh",
    "postal_code": "12345",
    "country": "Saudi Arabia"
  },
  "location": {
    "lat": 24.7136,
    "lng": 46.6753
  },
  "display_name": "King Fahd Street, Al Olaya, Riyadh, Saudi Arabia",
  "confidence": 0.85
}
```

### Geocode Address
```http
POST /geocode
```

Request:
```json
{
  "address": "طريق الملك عبدالله، الرياض"
}
```

Response:
```json
{
  "location": {
    "lat": 24.7136,
    "lng": 46.6753
  },
  "display_name": "King Abdullah Road, Riyadh, Saudi Arabia",
  "confidence": 0.85
}
```

### Reverse Geocode
```http
POST /reverse
```

Request:
```json
{
  "lat": 24.7136,
  "lng": 46.6753
}
```

Response:
```json
{
  "display_name": "King Fahd Street, Al Olaya, Riyadh, Saudi Arabia",
  "address": {
    "street": "King Fahd Street",
    "district": "Al Olaya",
    "city": "Riyadh",
    "postal_code": "12345",
    "country": "Saudi Arabia"
  }
}
```

## Arabic Address Examples

### Example 1: Full Address with District
```
Input: "شارع الأمير محمد بن عبدالعزيز، حي الملز، الرياض 12345"
```

Parsed components:
- Street: `الأمير محمد بن عبدالعزيز`
- District: `الملز`
- City: `Riyadh`
- Postal Code: `12345`
- Country: `Saudi Arabia`

### Example 2: Simple Street Address
```
Input: "طريق الملك فهد، جدة"
```

Parsed components:
- Street: `الملك فهد`
- District: `null`
- City: `Jeddah`
- Postal Code: `null`
- Country: `Saudi Arabia`

### Example 3: District and City Only
```
Input: "حي النخيل، الدمام"
```

Parsed components:
- Street: `null`
- District: `النخيل`
- City: `Dammam`
- Postal Code: `null`
- Country: `Saudi Arabia`

### Example 4: Bilingual Address
```json
{
  "ar": "شارع التحلية، حي الروضة، جدة",
  "en": "Tahlia Street, Al Rawdah District, Jeddah"
}
```

Parsed components:
- Street: `التحلية` (extracted from Arabic)
- District: `الروضة` (extracted from Arabic)
- City: `Jeddah`
- Country: `Saudi Arabia`

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org
USER_AGENT=NajahDeliveryOS/1.0
RATE_LIMIT_SECONDS=1
DEFAULT_COUNTRY=Saudi Arabia
PORT=5001
FLASK_ENV=production
```

## Installation

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Run the service
python app.py
```

### Docker

```bash
# Build image
docker build -t geocoding-service .

# Run container
docker run -p 5001:5001 --env-file .env geocoding-service
```

## Testing

```bash
# Run tests
pytest tests/

# Test with curl
curl -X POST http://localhost:5001/normalize \
  -H "Content-Type: application/json" \
  -d '{"address": {"ar": "شارع الملك فهد، الرياض"}}'
```

## Address Format Guidelines

For best results when parsing Arabic addresses:

1. **Use Standard Keywords**: Include keywords like `شارع` (street), `حي` (district), `طريق` (road)
2. **Include City Name**: Always include the city in Arabic or English
3. **Postal Codes**: KSA postal codes are 5 digits
4. **Separators**: Use commas (`,` or `،`) to separate components
5. **Bilingual Preferred**: Provide both Arabic and English when available

### Good Examples ✓
- `شارع الملك فهد، حي العليا، الرياض`
- `طريق الملك عبدالله، جدة 21589`
- `حي الفيصلية، الدمام`

### Less Optimal Examples
- `الرياض` (too vague)
- `شارع الملك` (incomplete street name)
- Address without city

## Rate Limiting

The service respects Nominatim's usage policy:
- Minimum 1 second between requests (configurable)
- Proper User-Agent header
- Automatic fallback on errors

## Fallback Behavior

When an address cannot be geocoded:
- Returns Riyadh city center coordinates (24.7136, 46.6753)
- Sets confidence to 0.1
- Logs warning for monitoring

## License

Part of Najah Delivery OS

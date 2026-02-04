# ADR-0003: OSRM as Routing Engine

**Status**: Accepted  
**Date**: 2024-01-15  
**Decision Makers**: Engineering Team, Optimization Lead  
**Technical Story**: Choose routing engine for route optimization in Najah Delivery OS

## Context

Najah Delivery OS requires a routing engine to:
- Calculate **distance and duration** between delivery locations
- Generate **distance/duration matrices** for VRP optimization
- Provide **turn-by-turn navigation** for courier drivers
- Handle **KSA road networks** with accurate traffic patterns
- Support **high request volume** (100s of routes per optimization)

Requirements:
- **Real-world routing**: Use actual road networks, not straight-line distance
- **Fast matrix calculation**: < 5 seconds for 50x50 location matrix
- **KSA coverage**: Complete road data for major cities
- **Self-hostable**: Run on our infrastructure (no per-request API costs)
- **Free/open source**: Budget constraints for MVP

Options considered:
1. **OSRM** (Open Source Routing Machine)
2. **Google Maps Directions API**
3. **Mapbox Directions API**
4. **GraphHopper**
5. **Straight-line distance** (Haversine formula)

## Decision

We will use **OSRM** (Open Source Routing Machine) as the routing engine for Najah Delivery OS.

## Rationale

### Why OSRM?

#### 1. Self-Hostable and Free

OSRM is **completely free** with no API limits:

```yaml
# docker-compose.yml
osrm-backend:
  image: osrm/osrm-backend:latest
  command: osrm-routed --algorithm mld /data/saudi-arabia-latest.osrm
  ports:
    - "5000:5000"
  volumes:
    - ./osrm-data:/data
```

**Cost comparison:**
- **OSRM**: $0 (self-hosted), ~$60/month EC2 t3.large
- **Google Maps**: $5 per 1000 requests (matrix) = $500/month for 100K requests
- **Mapbox**: $4 per 1000 requests (matrix) = $400/month for 100K requests

For 100,000 optimizations/month, OSRM saves **$400-500/month**.

#### 2. Extremely Fast

OSRM uses **Multi-Level Dijkstra** (MLD) algorithm for sub-millisecond routing:

```bash
# Calculate route between 2 points
curl "http://localhost:5000/route/v1/driving/46.6753,24.7136;46.7235,24.7242"
# Response time: ~20-50ms

# Calculate 10x10 distance matrix
curl "http://localhost:5000/table/v1/driving/46.67,24.71;46.72,24.72;..."
# Response time: ~100-200ms
```

**Performance:**
- Single route: 20-50ms
- 10x10 matrix: 100-200ms
- 50x50 matrix: 500-1000ms
- 100x100 matrix: 2-5 seconds

**Alternatives:**
- **Google Maps**: 200-500ms per request (network latency + processing)
- **Mapbox**: 150-400ms per request
- **GraphHopper**: Similar to OSRM but slightly slower

#### 3. Complete KSA Coverage

OSRM uses **OpenStreetMap (OSM)** data, which has excellent KSA coverage:

- **Major cities**: Riyadh, Jeddah, Dammam, Mecca, Medina (100% coverage)
- **Secondary cities**: Khobar, Taif, Abha, Tabuk (95%+ coverage)
- **Rural areas**: 80%+ coverage (improving continuously)
- **Active community**: Saudi OSM contributors update roads weekly

**OSM KSA Stats:**
- 2.5 million road segments
- 150,000 buildings
- Updated weekly by local community

**Setup:**

```bash
# Download KSA map data from Geofabrik
wget https://download.geofabrik.de/asia/saudi-arabia-latest.osm.pbf

# Pre-process for OSRM
docker run -t -v $(pwd):/data osrm/osrm-backend osrm-extract \
  -p /opt/car.lua /data/saudi-arabia-latest.osm.pbf

docker run -t -v $(pwd):/data osrm/osrm-backend osrm-partition \
  /data/saudi-arabia-latest.osrm

docker run -t -v $(pwd):/data osrm/osrm-backend osrm-customize \
  /data/saudi-arabia-latest.osrm

# Start OSRM server
docker run -t -i -p 5000:5000 -v $(pwd):/data \
  osrm/osrm-backend osrm-routed --algorithm mld /data/saudi-arabia-latest.osrm
```

#### 4. Matrix API for VRP Optimization

OSRM's **Table API** generates distance/duration matrices essential for VRP:

```python
# optimizer/osrm_client.py
import requests

def get_distance_matrix(coordinates):
    """
    Get distance/duration matrix for list of coordinates.
    coordinates: [(lng, lat), (lng, lat), ...]
    """
    coords_str = ";".join([f"{lng},{lat}" for lng, lat in coordinates])
    url = f"http://osrm:5000/table/v1/driving/{coords_str}"
    
    response = requests.get(url, params={"annotations": "distance,duration"})
    data = response.json()
    
    return {
        "distances": data["distances"],  # meters
        "durations": data["durations"]   # seconds
    }

# Usage in VRP solver
locations = [
    (46.6753, 24.7136),  # Depot
    (46.7235, 24.7242),  # Order 1
    (46.6935, 24.7635),  # Order 2
    # ... more orders
]

matrix = get_distance_matrix(locations)

# Pass to OR-Tools VRP solver
# distances = matrix["distances"]
# durations = matrix["durations"]
```

**Response example:**

```json
{
  "code": "Ok",
  "distances": [
    [0, 5420, 8930],
    [5420, 0, 6210],
    [8930, 6210, 0]
  ],
  "durations": [
    [0, 623, 1024],
    [623, 0, 712],
    [1024, 712, 0]
  ]
}
```

#### 5. Turn-by-Turn Navigation

OSRM provides **step-by-step directions** for driver app:

```bash
curl "http://localhost:5000/route/v1/driving/46.6753,24.7136;46.7235,24.7242?steps=true&overview=full"
```

**Response includes:**
- Geometry (polyline for map display)
- Step-by-step instructions ("Turn right onto King Fahd Road")
- Distance and duration per step
- Lane guidance

**Driver app integration:**

```javascript
// driver-app/src/components/Navigation.jsx
async function getRoute(origin, destination) {
  const response = await fetch(
    `http://localhost:5000/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?steps=true`
  );
  const data = await response.json();
  
  return {
    geometry: data.routes[0].geometry,
    steps: data.routes[0].legs[0].steps,
    distance: data.routes[0].distance,
    duration: data.routes[0].duration
  };
}
```

#### 6. No Vendor Lock-In

OSRM is **open source** (BSD 2-Clause license):
- Can modify and extend if needed
- No API rate limits or quotas
- No sudden pricing changes
- Active community and development

If we outgrow OSRM, we can switch to commercial providers without code changes (same API structure).

### OSRM Limitations We Accept

1. **No Real-Time Traffic**
   - OSRM uses historical speed profiles, not live traffic
   - Mitigation: Update map data monthly, use traffic factors
   - Reality: For last-mile delivery, traffic is less critical than distance

2. **Self-Hosting Overhead**
   - Requires EC2 instance, map data updates, monitoring
   - Mitigation: Docker Compose for local, EC2 for production
   - Reality: Operational cost < API cost savings

3. **Map Data Freshness**
   - OSM data updated by community (lag time)
   - Mitigation: Monthly map updates from Geofabrik
   - Reality: Road networks don't change daily, weekly updates sufficient

4. **No Advanced Features**
   - No toll road avoidance, ferries, live parking
   - Mitigation: Not needed for delivery use case
   - Reality: Basic routing sufficient for MVP

## Comparison with Alternatives

### Google Maps Directions API

**Pros:**
- ✅ Real-time traffic data
- ✅ Extensive POI data
- ✅ 99.9% uptime SLA
- ✅ Lane guidance, 3D buildings

**Cons:**
- ❌ **Cost**: $5 per 1000 matrix requests = $500/month for 100K
- ❌ **Rate limits**: 100 requests/second (requires complex queuing)
- ❌ **Vendor lock-in**: Pricing can change
- ❌ **Network dependency**: Requires internet for every request
- ❌ **Terms of Service**: Cached data restrictions

**Verdict:** Too expensive for MVP. Consider for premium features later.

### Mapbox Directions API

**Pros:**
- ✅ Good performance (CDN-backed)
- ✅ Beautiful maps (better than Google in some regions)
- ✅ Traffic-aware routing

**Cons:**
- ❌ **Cost**: $4 per 1000 matrix requests = $400/month for 100K
- ❌ **Rate limits**: 600 requests/minute
- ❌ **KSA coverage**: Good but not perfect
- ❌ **Network dependency**: Requires internet

**Verdict:** Cheaper than Google but still expensive. OSRM is free.

### GraphHopper

**Pros:**
- ✅ Open source (similar to OSRM)
- ✅ Self-hostable
- ✅ Java-based (better for some teams)

**Cons:**
- ❌ **Performance**: 20-30% slower than OSRM
- ❌ **Memory usage**: Higher than OSRM
- ❌ **Community**: Smaller than OSRM

**Verdict:** Good alternative but OSRM has better performance and community.

### Straight-Line Distance (Haversine)

**Pros:**
- ✅ Extremely fast (< 1ms)
- ✅ No dependencies
- ✅ Zero cost

**Cons:**
- ❌ **Inaccurate**: Assumes straight-line travel
- ❌ **No road network**: Ignores obstacles, highways
- ❌ **Poor for optimization**: VRP solutions unrealistic

**Verdict:** Only for quick estimates, not production routing.

## Technical Implementation

### OSRM Service in Docker Compose

```yaml
# docker-compose.yml
services:
  osrm-backend:
    image: osrm/osrm-backend:v5.27.1
    container_name: najah-osrm
    command: osrm-routed --algorithm mld /data/saudi-arabia-latest.osrm
    ports:
      - "5000:5000"
    volumes:
      - ./osrm-data:/data
    networks:
      - najah-network
    restart: unless-stopped
```

### Python Client for Optimizer

```python
# services/optimizer/osrm_client.py
import requests
from typing import List, Tuple, Dict

class OSRMClient:
    def __init__(self, base_url: str = "http://osrm:5000"):
        self.base_url = base_url
    
    def get_matrix(
        self, 
        coordinates: List[Tuple[float, float]]
    ) -> Dict[str, List[List[int]]]:
        """
        Get distance/duration matrix for coordinates.
        
        Args:
            coordinates: List of (longitude, latitude) tuples
        
        Returns:
            Dict with 'distances' (meters) and 'durations' (seconds)
        """
        coords_str = ";".join([f"{lng},{lat}" for lng, lat in coordinates])
        url = f"{self.base_url}/table/v1/driving/{coords_str}"
        
        params = {
            "annotations": "distance,duration",
            "fallback_speed": 30  # km/h if route not found
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if data["code"] != "Ok":
            raise Exception(f"OSRM error: {data.get('message')}")
        
        return {
            "distances": data["distances"],
            "durations": data["durations"]
        }
    
    def get_route(
        self,
        start: Tuple[float, float],
        end: Tuple[float, float],
        steps: bool = False
    ) -> Dict:
        """Get route between two points."""
        coords_str = f"{start[0]},{start[1]};{end[0]},{end[1]}"
        url = f"{self.base_url}/route/v1/driving/{coords_str}"
        
        params = {
            "steps": "true" if steps else "false",
            "overview": "full",
            "geometries": "geojson"
        }
        
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        
        data = response.json()
        
        if data["code"] != "Ok":
            raise Exception(f"OSRM error: {data.get('message')}")
        
        route = data["routes"][0]
        
        return {
            "distance": route["distance"],  # meters
            "duration": route["duration"],  # seconds
            "geometry": route["geometry"],
            "steps": route["legs"][0]["steps"] if steps else []
        }
```

### Map Data Update Script

```bash
#!/bin/bash
# scripts/update-osrm-data.sh

set -e

OSRM_DATA_DIR="./osrm-data"
MAP_URL="https://download.geofabrik.de/asia/saudi-arabia-latest.osm.pbf"

echo "Downloading latest KSA map data..."
wget -O $OSRM_DATA_DIR/saudi-arabia-latest.osm.pbf $MAP_URL

echo "Extracting..."
docker run -t -v $(pwd)/$OSRM_DATA_DIR:/data osrm/osrm-backend \
  osrm-extract -p /opt/car.lua /data/saudi-arabia-latest.osm.pbf

echo "Partitioning..."
docker run -t -v $(pwd)/$OSRM_DATA_DIR:/data osrm/osrm-backend \
  osrm-partition /data/saudi-arabia-latest.osrm

echo "Customizing..."
docker run -t -v $(pwd)/$OSRM_DATA_DIR:/data osrm/osrm-backend \
  osrm-customize /data/saudi-arabia-latest.osrm

echo "Restarting OSRM service..."
docker compose restart osrm-backend

echo "OSRM data updated successfully!"
```

Schedule monthly with cron:

```bash
# crontab -e
0 2 1 * * /path/to/scripts/update-osrm-data.sh >> /var/log/osrm-update.log 2>&1
```

## Performance Benchmarks

### Matrix Calculation Performance

| Matrix Size | OSRM (self-hosted) | Google Maps API | Mapbox API |
|-------------|--------------------|-----------------| -----------|
| 10x10       | 100-200ms          | 500-800ms       | 400-700ms  |
| 25x25       | 250-400ms          | 1500-2500ms     | 1200-2000ms|
| 50x50       | 500-1000ms         | 4000-6000ms     | 3500-5500ms|
| 100x100     | 2000-5000ms        | 15000-25000ms   | 12000-20000ms|

**Note:** Google/Mapbox times include network latency. OSRM is local.

### Resource Requirements

- **RAM**: 4-8GB for KSA map data
- **CPU**: 2 cores minimum (4 recommended)
- **Disk**: 10GB for map data
- **Network**: None (self-hosted)

**EC2 Instance Sizing:**
- Development: t3.medium (2 vCPU, 4GB RAM) - $30/month
- Production: t3.large (2 vCPU, 8GB RAM) - $60/month

## Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Outdated map data | Medium | Monthly updates from Geofabrik |
| OSRM service downtime | High | Health checks, automatic restart, backup instance |
| Inaccurate routes in rural areas | Low | Use fallback speed, manual corrections |
| Memory exhaustion | Medium | Monitor RAM usage, auto-scaling, increase instance size |
| Map data corruption | Low | Backup map data before updates, rollback script |

## Success Criteria

This decision is successful if:
- ✅ 50x50 matrix calculation completes in < 5 seconds
- ✅ Route optimization uses real road distances, not straight-line
- ✅ Cost savings of $400+/month vs. commercial APIs
- ✅ OSRM uptime > 99.5%
- ✅ Map data freshness < 30 days old

## Future Considerations

### When to Consider Commercial APIs

Switch to Google Maps or Mapbox if:
- Real-time traffic is critical (premium feature)
- Need 99.9% SLA with support
- Request volume exceeds OSRM capacity (> 1M/day)
- Budget allows ($1000+/month)

### Hybrid Approach

Use OSRM for batch optimization, Google Maps for real-time driver navigation:
- OSRM: Route planning (free, fast)
- Google Maps: Live traffic updates (pay per use)

## Revisions

- **2024-01-15**: Initial decision (v1.0)

## References

- [OSRM Documentation](http://project-osrm.org/)
- [OpenStreetMap Saudi Arabia](https://www.openstreetmap.org/#map=6/24.0/45.0)
- [Geofabrik Downloads](https://download.geofabrik.de/asia/saudi-arabia.html)
- [OSRM Docker Image](https://hub.docker.com/r/osrm/osrm-backend/)
- [OSRM API Documentation](https://github.com/Project-OSRM/osrm-backend/blob/master/docs/http.md)

## Related ADRs

- [ADR-0001: Monorepo Structure](ADR-0001-monorepo.md)
- [ADR-0002: Database Choice](ADR-0002-database-choice.md)

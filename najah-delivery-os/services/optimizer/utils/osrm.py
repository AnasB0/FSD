import requests
import logging
import os

logger = logging.getLogger(__name__)

def get_distance_matrix(locations):
    """
    Get distance and duration matrix from OSRM table API.
    
    Args:
        locations: List of dicts with 'lat' and 'lng' keys
        
    Returns:
        dict with 'distances' (meters) and 'durations' (seconds) matrices,
        or None if request fails
    """
    osrm_base_url = os.getenv('OSRM_BASE_URL', 'http://router.project-osrm.org')
    
    if not locations or len(locations) < 2:
        logger.warning("Need at least 2 locations for distance matrix")
        return None
    
    # Format coordinates as "lon,lat;lon,lat;..."
    coords = ";".join([f"{loc['lng']},{loc['lat']}" for loc in locations])
    url = f"{osrm_base_url}/table/v1/driving/{coords}"
    
    params = {
        'annotations': 'distance,duration'
    }
    
    try:
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        if data.get('code') != 'Ok':
            logger.error(f"OSRM API error: {data.get('message', 'Unknown error')}")
            return None
        
        return {
            'distances': data.get('distances', []),
            'durations': data.get('durations', [])
        }
    except requests.RequestException as e:
        logger.error(f"Failed to get distance matrix from OSRM: {e}")
        return None

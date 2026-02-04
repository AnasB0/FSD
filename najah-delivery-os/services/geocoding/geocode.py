"""Geocoding module using Nominatim API."""

import requests
from typing import Dict, Optional, Tuple
from config import get_config
from utils import validate_coordinates, get_city_center


def geocode_address(
    normalized_address: Dict[str, Optional[str]], 
    country: str = 'SA'
) -> Optional[Tuple[float, float]]:
    """Geocode a normalized address using Nominatim API.
    
    Args:
        normalized_address: Dictionary with address components (street, district, city, postal_code).
        country: ISO country code (default: 'SA' for Saudi Arabia).
        
    Returns:
        Tuple of (latitude, longitude) if successful, None otherwise.
        Falls back to city center coordinates if geocoding fails.
    """
    config = get_config()
    
    # Build query string from address components
    query_parts = []
    
    if normalized_address.get('street'):
        query_parts.append(normalized_address['street'])
    
    if normalized_address.get('district'):
        query_parts.append(normalized_address['district'])
    
    if normalized_address.get('city'):
        query_parts.append(normalized_address['city'])
    else:
        # Use default city if none provided
        query_parts.append(config.DEFAULT_CITY)
    
    if normalized_address.get('postal_code'):
        query_parts.append(normalized_address['postal_code'])
    
    # Add country
    query_parts.append(country)
    
    query = ', '.join(query_parts)
    
    # Call Nominatim API
    try:
        url = f"{config.NOMINATIM_BASE_URL}/search"
        params = {
            'q': query,
            'format': 'json',
            'limit': 1,
            'addressdetails': 1
        }
        headers = {
            'User-Agent': config.USER_AGENT
        }
        
        response = requests.get(
            url,
            params=params,
            headers=headers,
            timeout=config.GEOCODING_TIMEOUT_SECONDS
        )
        
        if response.status_code == 200:
            results = response.json()
            
            if results and len(results) > 0:
                result = results[0]
                lat = float(result['lat'])
                lon = float(result['lon'])
                
                if validate_coordinates(lat, lon):
                    return (lat, lon)
        
    except (requests.RequestException, ValueError, KeyError) as e:
        print(f"Geocoding error: {e}")
    
    # Fallback to city center coordinates
    city = normalized_address.get('city') or config.DEFAULT_CITY
    return get_city_center(city)


def reverse_geocode(
    latitude: float, 
    longitude: float
) -> Optional[Dict[str, Optional[str]]]:
    """Reverse geocode coordinates to get address components.
    
    Args:
        latitude: Latitude coordinate.
        longitude: Longitude coordinate.
        
    Returns:
        Dictionary with address components if successful, None otherwise.
    """
    if not validate_coordinates(latitude, longitude):
        return None
    
    config = get_config()
    
    try:
        url = f"{config.NOMINATIM_BASE_URL}/reverse"
        params = {
            'lat': latitude,
            'lon': longitude,
            'format': 'json',
            'addressdetails': 1
        }
        headers = {
            'User-Agent': config.USER_AGENT
        }
        
        response = requests.get(
            url,
            params=params,
            headers=headers,
            timeout=config.GEOCODING_TIMEOUT_SECONDS
        )
        
        if response.status_code == 200:
            result = response.json()
            address = result.get('address', {})
            
            return {
                'street': address.get('road') or address.get('street'),
                'district': address.get('suburb') or address.get('neighbourhood'),
                'city': address.get('city') or address.get('town') or address.get('village'),
                'postal_code': address.get('postcode')
            }
    
    except (requests.RequestException, ValueError, KeyError) as e:
        print(f"Reverse geocoding error: {e}")
    
    return None

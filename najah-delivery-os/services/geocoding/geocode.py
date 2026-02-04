"""
Geocoding module using Nominatim API with proper rate limiting and fallbacks.
"""
import os
import time
import requests
import logging
from typing import Dict, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Nominatim configuration
NOMINATIM_BASE_URL = os.getenv('NOMINATIM_BASE_URL', 'https://nominatim.openstreetmap.org')
USER_AGENT = os.getenv('USER_AGENT', 'NajahDeliveryOS/1.0')
RATE_LIMIT_SECONDS = float(os.getenv('RATE_LIMIT_SECONDS', '1'))

# Fallback location (Riyadh city center)
RIYADH_CENTER = {
    'lat': 24.7136,
    'lng': 46.6753,
    'display_name': 'Riyadh, Saudi Arabia',
    'confidence': 0.1
}

# Track last request time for rate limiting
_last_request_time = 0


def geocode_address(address: str) -> Dict[str, any]:
    """
    Geocode an address using Nominatim API.
    
    Args:
        address: Address string to geocode
        
    Returns:
        Dictionary with:
        {
            'lat': float,
            'lng': float,
            'display_name': str,
            'confidence': float (0-1)
        }
    """
    global _last_request_time
    
    if not address or not address.strip():
        logger.warning("Empty address provided, returning Riyadh center")
        return RIYADH_CENTER.copy()
    
    # Rate limiting: ensure minimum time between requests
    elapsed = time.time() - _last_request_time
    if elapsed < RATE_LIMIT_SECONDS:
        time.sleep(RATE_LIMIT_SECONDS - elapsed)
    
    try:
        # Make request to Nominatim
        headers = {
            'User-Agent': USER_AGENT
        }
        
        params = {
            'q': address,
            'format': 'json',
            'limit': 1,
            'addressdetails': 1
        }
        
        url = f"{NOMINATIM_BASE_URL}/search"
        
        logger.info(f"Geocoding address: {address}")
        
        _last_request_time = time.time()
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        
        results = response.json()
        
        if not results:
            logger.warning(f"No results found for address: {address}")
            return RIYADH_CENTER.copy()
        
        # Extract first result
        result = results[0]
        
        geocoded = {
            'lat': float(result['lat']),
            'lng': float(result['lon']),
            'display_name': result.get('display_name', address),
            'confidence': _calculate_confidence(result)
        }
        
        logger.info(f"Successfully geocoded to: ({geocoded['lat']}, {geocoded['lng']})")
        
        return geocoded
        
    except requests.exceptions.Timeout:
        logger.error("Nominatim API request timed out")
        return RIYADH_CENTER.copy()
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Error calling Nominatim API: {e}")
        return RIYADH_CENTER.copy()
        
    except (KeyError, ValueError, TypeError) as e:
        logger.error(f"Error parsing Nominatim response: {e}")
        return RIYADH_CENTER.copy()


def _calculate_confidence(result: dict) -> float:
    """
    Calculate confidence score based on Nominatim result quality.
    
    Args:
        result: Nominatim API result dictionary
        
    Returns:
        Confidence score between 0 and 1
    """
    # Base confidence on importance score from Nominatim
    importance = float(result.get('importance', 0.5))
    
    # Adjust based on place type
    place_type = result.get('type', '')
    osm_type = result.get('osm_type', '')
    
    confidence = importance
    
    # Higher confidence for specific places
    if osm_type == 'node' or place_type in ['house', 'building', 'address']:
        confidence = min(confidence * 1.2, 1.0)
    
    # Lower confidence for very general places
    if place_type in ['country', 'state', 'region']:
        confidence = confidence * 0.5
    
    # Ensure confidence is in valid range
    return max(0.0, min(1.0, confidence))


def reverse_geocode(lat: float, lng: float) -> Dict[str, any]:
    """
    Reverse geocode coordinates to an address.
    
    Args:
        lat: Latitude
        lng: Longitude
        
    Returns:
        Dictionary with address components and display name
    """
    global _last_request_time
    
    # Rate limiting
    elapsed = time.time() - _last_request_time
    if elapsed < RATE_LIMIT_SECONDS:
        time.sleep(RATE_LIMIT_SECONDS - elapsed)
    
    try:
        headers = {
            'User-Agent': USER_AGENT
        }
        
        params = {
            'lat': lat,
            'lon': lng,
            'format': 'json',
            'addressdetails': 1
        }
        
        url = f"{NOMINATIM_BASE_URL}/reverse"
        
        logger.info(f"Reverse geocoding: ({lat}, {lng})")
        
        _last_request_time = time.time()
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        
        result = response.json()
        
        address_data = result.get('address', {})
        
        return {
            'display_name': result.get('display_name', ''),
            'address': {
                'street': address_data.get('road'),
                'district': address_data.get('suburb') or address_data.get('neighbourhood'),
                'city': address_data.get('city') or address_data.get('town'),
                'postal_code': address_data.get('postcode'),
                'country': address_data.get('country')
            }
        }
        
    except Exception as e:
        logger.error(f"Error in reverse geocoding: {e}")
        return {
            'display_name': f"Location ({lat}, {lng})",
            'address': {}
        }

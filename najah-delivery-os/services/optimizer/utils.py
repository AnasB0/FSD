"""
Utility functions for the Optimizer service.
Provides distance calculations, validation, and parsing helpers.
"""
import math
from datetime import datetime
from typing import Tuple, Optional


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points on Earth.
    
    Args:
        lat1: Latitude of first point in degrees
        lon1: Longitude of first point in degrees
        lat2: Latitude of second point in degrees
        lon2: Longitude of second point in degrees
    
    Returns:
        float: Distance in kilometers
    """
    # Earth radius in kilometers
    R = 6371.0
    
    # Convert degrees to radians
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    # Haversine formula
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c


def validate_coordinates(lat: float, lon: float) -> bool:
    """
    Validate that coordinates are within valid ranges.
    
    Args:
        lat: Latitude in degrees
        lon: Longitude in degrees
    
    Returns:
        bool: True if coordinates are valid
    """
    if not (-90 <= lat <= 90):
        return False
    if not (-180 <= lon <= 180):
        return False
    return True


def parse_time_window(window: Optional[str]) -> Optional[datetime]:
    """
    Parse ISO 8601 datetime string to datetime object.
    
    Args:
        window: ISO 8601 datetime string
    
    Returns:
        Optional[datetime]: Parsed datetime or None if invalid
    """
    if not window:
        return None
    
    try:
        # Try parsing with timezone
        return datetime.fromisoformat(window.replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        return None


def estimate_travel_time(distance_km: float, avg_speed_kmh: float = 40.0) -> float:
    """
    Estimate travel time based on distance and average speed.
    
    Args:
        distance_km: Distance in kilometers
        avg_speed_kmh: Average speed in km/h (default: 40 km/h)
    
    Returns:
        float: Estimated time in minutes
    """
    if distance_km <= 0:
        return 0.0
    return (distance_km / avg_speed_kmh) * 60

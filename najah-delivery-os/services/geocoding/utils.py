"""Utility functions for geocoding service."""

import re
from typing import Optional, Tuple


def clean_arabic_text(text: str) -> str:
    """Remove diacritics and normalize Arabic characters.
    
    Args:
        text: Arabic text to clean.
        
    Returns:
        Cleaned and normalized Arabic text.
    """
    if not text:
        return ""
    
    # Remove Arabic diacritics (tashkeel)
    diacritics = re.compile(
        r'[\u0617-\u061A\u064B-\u0652\u0657-\u0658\u0670\u06D6-\u06ED]'
    )
    text = diacritics.sub('', text)
    
    # Normalize Arabic characters
    text = text.replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا')
    text = text.replace('ة', 'ه')
    text = text.replace('ى', 'ي')
    
    return text.strip()


def is_arabic(text: str) -> bool:
    """Check if text contains Arabic script.
    
    Args:
        text: Text to check.
        
    Returns:
        True if text contains Arabic characters, False otherwise.
    """
    if not text:
        return False
    
    arabic_pattern = re.compile(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]')
    return bool(arabic_pattern.search(text))


def validate_coordinates(lat: Optional[float], lon: Optional[float]) -> bool:
    """Validate latitude and longitude coordinates.
    
    Args:
        lat: Latitude value.
        lon: Longitude value.
        
    Returns:
        True if coordinates are valid, False otherwise.
    """
    if lat is None or lon is None:
        return False
    
    try:
        lat_float = float(lat)
        lon_float = float(lon)
        return -90 <= lat_float <= 90 and -180 <= lon_float <= 180
    except (ValueError, TypeError):
        return False


def get_city_center(city_name: str) -> Tuple[float, float]:
    """Get default coordinates for major Saudi cities.
    
    Args:
        city_name: Name of the city.
        
    Returns:
        Tuple of (latitude, longitude) for the city center.
    """
    city_centers = {
        'riyadh': (24.7136, 46.6753),
        'الرياض': (24.7136, 46.6753),
        'jeddah': (21.5433, 39.1728),
        'جدة': (21.5433, 39.1728),
        'dammam': (26.4207, 50.0888),
        'الدمام': (26.4207, 50.0888),
        'mecca': (21.4225, 39.8262),
        'مكة': (21.4225, 39.8262),
        'medina': (24.5247, 39.5692),
        'المدينة': (24.5247, 39.5692),
    }
    
    city_lower = city_name.lower().strip()
    return city_centers.get(city_lower, (24.7136, 46.6753))  # Default to Riyadh

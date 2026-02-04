"""Address normalization module for parsing and structuring addresses."""

import re
from typing import Dict, Optional, Any
from utils import clean_arabic_text, is_arabic


def normalize_address(address_data: Dict[str, Any]) -> Dict[str, Optional[str]]:
    """Normalize and parse address data into structured components.
    
    Args:
        address_data: Dictionary containing address information with keys:
            - 'ar': Arabic address text (optional)
            - 'en': English address text (optional)
            - 'components': Pre-parsed address components (optional)
            
    Returns:
        Dictionary with normalized address components:
            - street: Street name and number
            - district: District or neighborhood
            - city: City name
            - postal_code: Postal code (if available)
    """
    normalized = {
        'street': None,
        'district': None,
        'city': None,
        'postal_code': None
    }
    
    # Check if components are already provided
    if 'components' in address_data and address_data['components']:
        components = address_data['components']
        normalized['street'] = components.get('street')
        normalized['district'] = components.get('district')
        normalized['city'] = components.get('city')
        normalized['postal_code'] = components.get('postal_code')
    
    # Parse Arabic address if provided
    if 'ar' in address_data and address_data['ar']:
        ar_components = parse_arabic_address(address_data['ar'])
        for key in ['street', 'district', 'city', 'postal_code']:
            if not normalized[key] and ar_components.get(key):
                normalized[key] = ar_components[key]
    
    # Parse English address if provided
    if 'en' in address_data and address_data['en']:
        en_components = parse_english_address(address_data['en'])
        for key in ['street', 'district', 'city', 'postal_code']:
            if not normalized[key] and en_components.get(key):
                normalized[key] = en_components[key]
    
    return normalized


def parse_arabic_address(address: str) -> Dict[str, Optional[str]]:
    """Parse Arabic address text into components.
    
    Args:
        address: Arabic address string.
        
    Returns:
        Dictionary with extracted address components.
    """
    components = {
        'street': None,
        'district': None,
        'city': None,
        'postal_code': None
    }
    
    if not address:
        return components
    
    # Clean the address text
    cleaned = clean_arabic_text(address)
    
    # Extract postal code (5 digits)
    postal_match = re.search(r'\b\d{5}\b', cleaned)
    if postal_match:
        components['postal_code'] = postal_match.group(0)
        cleaned = cleaned.replace(components['postal_code'], '').strip()
    
    # Common Arabic city names
    cities = [
        'الرياض', 'جدة', 'مكة', 'المدينة', 'الدمام', 'الخبر', 'الطائف',
        'تبوك', 'أبها', 'نجران', 'جازان', 'حائل', 'القصيم', 'الاحساء'
    ]
    
    for city in cities:
        if city in cleaned:
            components['city'] = city
            cleaned = cleaned.replace(city, '').strip()
            break
    
    # Extract district (حي pattern)
    district_match = re.search(r'حي\s+([^\s,،]+)', cleaned)
    if district_match:
        components['district'] = district_match.group(1)
        cleaned = re.sub(r'حي\s+[^\s,،]+', '', cleaned).strip()
    
    # Extract street (شارع pattern)
    street_match = re.search(r'شارع\s+([^\s,،]+(?:\s+[^\s,،]+)?)', cleaned)
    if street_match:
        components['street'] = street_match.group(1)
    elif cleaned:
        # If no street pattern found, use remaining text
        parts = [p.strip() for p in re.split(r'[,،]', cleaned) if p.strip()]
        if parts:
            components['street'] = parts[0]
            if len(parts) > 1 and not components['district']:
                components['district'] = parts[1]
    
    return components


def parse_english_address(address: str) -> Dict[str, Optional[str]]:
    """Parse English address text into components.
    
    Args:
        address: English address string.
        
    Returns:
        Dictionary with extracted address components.
    """
    components = {
        'street': None,
        'district': None,
        'city': None,
        'postal_code': None
    }
    
    if not address:
        return components
    
    address = address.strip()
    
    # Extract postal code (5 digits)
    postal_match = re.search(r'\b\d{5}\b', address)
    if postal_match:
        components['postal_code'] = postal_match.group(0)
        address = address.replace(components['postal_code'], '').strip()
    
    # Common English city names
    cities = [
        'Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar', 'Taif',
        'Tabuk', 'Abha', 'Najran', 'Jazan', 'Hail', 'Qassim', 'Ahsa'
    ]
    
    for city in cities:
        if city.lower() in address.lower():
            components['city'] = city
            # Remove city name (case-insensitive)
            address = re.sub(re.escape(city), '', address, flags=re.IGNORECASE).strip()
            break
    
    # Split by comma to get parts
    parts = [p.strip() for p in address.split(',') if p.strip()]
    
    if parts:
        # First part is typically street
        components['street'] = parts[0]
        
        # Second part could be district
        if len(parts) > 1 and not components['district']:
            components['district'] = parts[1]
        
        # If city wasn't found earlier, check last part
        if len(parts) > 2 and not components['city']:
            components['city'] = parts[-1]
    
    return components

"""
Address normalization module for Arabic and English addresses.
Handles KSA address parsing and standardization.
"""
import re
from typing import Dict, Optional


# KSA major cities mapping (Arabic to English)
KSA_CITIES = {
    'الرياض': 'Riyadh',
    'جدة': 'Jeddah',
    'الدمام': 'Dammam',
    'مكة': 'Mecca',
    'مكة المكرمة': 'Mecca',
    'المدينة': 'Medina',
    'المدينة المنورة': 'Medina',
    'riyadh': 'Riyadh',
    'jeddah': 'Jeddah',
    'dammam': 'Dammam',
    'mecca': 'Mecca',
    'medina': 'Medina',
}

# Common Arabic keywords for address components
STREET_KEYWORDS_AR = ['شارع', 'طريق', 'ش']
DISTRICT_KEYWORDS_AR = ['حي', 'منطقة', 'حى']


def parse_address(address_input: dict or str) -> Dict[str, Optional[str]]:
    """
    Parse and normalize an address from Arabic or English text.
    
    Args:
        address_input: Dictionary with 'ar' and/or 'en' keys, or plain string
        
    Returns:
        Dictionary with normalized address components:
        {
            'street': str,
            'district': str,
            'city': str,
            'postal_code': str,
            'country': str
        }
    """
    # Handle different input formats
    if isinstance(address_input, dict):
        arabic_text = address_input.get('ar', '')
        english_text = address_input.get('en', '')
        full_text = f"{arabic_text} {english_text}".strip()
    else:
        full_text = str(address_input)
    
    if not full_text:
        return {
            'street': None,
            'district': None,
            'city': None,
            'postal_code': None,
            'country': 'Saudi Arabia'
        }
    
    # Initialize result
    result = {
        'street': None,
        'district': None,
        'city': None,
        'postal_code': None,
        'country': 'Saudi Arabia'
    }
    
    # Extract city
    result['city'] = _extract_city(full_text)
    
    # Extract postal code (5 digits in KSA)
    postal_match = re.search(r'\b(\d{5})\b', full_text)
    if postal_match:
        result['postal_code'] = postal_match.group(1)
    
    # Extract street
    result['street'] = _extract_street(full_text)
    
    # Extract district
    result['district'] = _extract_district(full_text)
    
    return result


def _extract_city(text: str) -> Optional[str]:
    """Extract and normalize city name from text."""
    text_lower = text.lower()
    
    # Check for known cities
    for city_ar, city_en in KSA_CITIES.items():
        if city_ar in text or city_ar.lower() in text_lower:
            return city_en
        if city_en.lower() in text_lower:
            return city_en
    
    return None


def _extract_street(text: str) -> Optional[str]:
    """Extract street name from text."""
    # Try Arabic street patterns
    for keyword in STREET_KEYWORDS_AR:
        pattern = rf'{keyword}\s+([\u0600-\u06FF\s]+?)(?:\s*[،,]|\s*$|\s+\d)'
        match = re.search(pattern, text)
        if match:
            street = match.group(1).strip()
            return _clean_text(street)
    
    # Try English street patterns
    street_pattern = r'(?:Street|St\.?|Road|Rd\.?)\s+([A-Za-z0-9\s]+?)(?:\s*[,]|\s*$)'
    match = re.search(street_pattern, text, re.IGNORECASE)
    if match:
        return _clean_text(match.group(1))
    
    # Try reverse English pattern (name before keyword)
    rev_pattern = r'([A-Za-z0-9\s]+?)\s+(?:Street|St\.?|Road|Rd\.?)'
    match = re.search(rev_pattern, text, re.IGNORECASE)
    if match:
        return _clean_text(match.group(1))
    
    return None


def _extract_district(text: str) -> Optional[str]:
    """Extract district/neighborhood name from text."""
    # Try Arabic district patterns
    for keyword in DISTRICT_KEYWORDS_AR:
        pattern = rf'{keyword}\s+([\u0600-\u06FF\s]+?)(?:\s*[،,]|\s*$|\s+\d)'
        match = re.search(pattern, text)
        if match:
            district = match.group(1).strip()
            return _clean_text(district)
    
    # Try English district patterns
    district_pattern = r'(?:District|Neighborhood|Area)\s+([A-Za-z0-9\s]+?)(?:\s*[,]|\s*$)'
    match = re.search(district_pattern, text, re.IGNORECASE)
    if match:
        return _clean_text(match.group(1))
    
    return None


def _clean_text(text: str) -> str:
    """Clean and standardize text."""
    if not text:
        return text
    
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    
    # Remove leading/trailing whitespace and punctuation
    text = text.strip(' ،,.')
    
    return text


def format_address_for_geocoding(normalized: Dict[str, Optional[str]]) -> str:
    """
    Format normalized address components into a single string for geocoding.
    
    Args:
        normalized: Dictionary with address components
        
    Returns:
        Formatted address string
    """
    components = []
    
    if normalized.get('street'):
        components.append(normalized['street'])
    
    if normalized.get('district'):
        components.append(normalized['district'])
    
    if normalized.get('city'):
        components.append(normalized['city'])
    
    if normalized.get('country'):
        components.append(normalized['country'])
    
    return ', '.join(components)

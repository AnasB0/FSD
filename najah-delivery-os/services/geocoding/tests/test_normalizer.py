"""
Placeholder tests for address normalizer.
Run with: pytest tests/
"""
import pytest
from normalizer import parse_address, format_address_for_geocoding


def test_parse_arabic_full_address():
    """Test parsing a complete Arabic address."""
    address = "شارع الملك فهد، حي العليا، الرياض 12345"
    result = parse_address(address)
    
    assert result['city'] == 'Riyadh'
    assert result['postal_code'] == '12345'
    assert result['country'] == 'Saudi Arabia'
    # Street and district parsing may need adjustment
    

def test_parse_english_address():
    """Test parsing an English address."""
    address = "King Fahd Street, Riyadh, Saudi Arabia"
    result = parse_address(address)
    
    assert result['city'] == 'Riyadh'
    assert result['country'] == 'Saudi Arabia'


def test_parse_bilingual_address():
    """Test parsing bilingual address."""
    address = {
        'ar': 'شارع الملك فهد، الرياض',
        'en': 'King Fahd Street, Riyadh'
    }
    result = parse_address(address)
    
    assert result['city'] == 'Riyadh'
    assert result['country'] == 'Saudi Arabia'


def test_parse_city_only():
    """Test parsing city-only input."""
    address = "الرياض"
    result = parse_address(address)
    
    assert result['city'] == 'Riyadh'
    assert result['country'] == 'Saudi Arabia'


def test_parse_empty_address():
    """Test handling empty address."""
    result = parse_address("")
    
    assert result['city'] is None
    assert result['street'] is None
    assert result['country'] == 'Saudi Arabia'


def test_format_for_geocoding():
    """Test formatting normalized address for geocoding."""
    normalized = {
        'street': 'King Fahd Street',
        'district': 'Al Olaya',
        'city': 'Riyadh',
        'postal_code': '12345',
        'country': 'Saudi Arabia'
    }
    
    formatted = format_address_for_geocoding(normalized)
    
    assert 'King Fahd Street' in formatted
    assert 'Riyadh' in formatted
    assert 'Saudi Arabia' in formatted


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

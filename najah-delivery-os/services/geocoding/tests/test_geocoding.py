"""Unit tests for the Geocoding service."""

import pytest
from unittest.mock import patch, Mock
from normalizer import normalize_address, parse_arabic_address, parse_english_address
from geocode import geocode_address, reverse_geocode
from utils import (
    clean_arabic_text,
    is_arabic,
    validate_coordinates,
    get_city_center
)


class TestNormalizer:
    """Test address normalization functions."""
    
    def test_normalize_arabic_address(self):
        """Test normalization of Arabic address."""
        address_data = {
            'ar': 'شارع الملك فهد، حي العليا، الرياض 12345'
        }
        
        result = normalize_address(address_data)
        
        assert result['street'] == 'الملك فهد'
        assert result['district'] == 'العليا'
        assert result['city'] == 'الرياض'
        assert result['postal_code'] == '12345'
    
    def test_normalize_english_address(self):
        """Test normalization of English address."""
        address_data = {
            'en': 'King Fahd Road, Al Olaya, Riyadh, 12345'
        }
        
        result = normalize_address(address_data)
        
        assert result['street'] == 'King Fahd Road'
        assert result['district'] == 'Al Olaya'
        assert result['city'] == 'Riyadh'
        assert result['postal_code'] == '12345'
    
    def test_normalize_with_components(self):
        """Test normalization with pre-parsed components."""
        address_data = {
            'components': {
                'street': 'King Fahd Road',
                'district': 'Al Olaya',
                'city': 'Riyadh',
                'postal_code': '12345'
            }
        }
        
        result = normalize_address(address_data)
        
        assert result == address_data['components']
    
    def test_parse_arabic_address_with_postal(self):
        """Test parsing Arabic address with postal code."""
        address = 'شارع التحلية، حي السليمانية، جدة 21465'
        
        result = parse_arabic_address(address)
        
        assert result['street'] == 'التحليه'
        assert result['district'] == 'السليمانيه'
        assert result['city'] == 'جدة'
        assert result['postal_code'] == '21465'
    
    def test_parse_english_address_simple(self):
        """Test parsing simple English address."""
        address = 'Prince Mohammed Bin Abdulaziz Street, Al Khobar'
        
        result = parse_english_address(address)
        
        assert 'Prince Mohammed Bin Abdulaziz Street' in result['street']
        assert result['city'] == 'Khobar'


class TestGeocode:
    """Test geocoding functions."""
    
    @patch('geocode.requests.get')
    def test_geocode_address(self, mock_get):
        """Test geocoding with mocked Nominatim response."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {
                'lat': '24.7136',
                'lon': '46.6753',
                'display_name': 'Riyadh, Saudi Arabia'
            }
        ]
        mock_get.return_value = mock_response
        
        normalized_address = {
            'street': 'King Fahd Road',
            'district': 'Al Olaya',
            'city': 'Riyadh',
            'postal_code': None
        }
        
        result = geocode_address(normalized_address)
        
        assert result is not None
        assert result[0] == 24.7136
        assert result[1] == 46.6753
    
    @patch('geocode.requests.get')
    def test_geocode_address_failure_fallback(self, mock_get):
        """Test geocoding fallback when API fails."""
        mock_get.side_effect = Exception('API Error')
        
        normalized_address = {
            'street': None,
            'district': None,
            'city': 'Riyadh',
            'postal_code': None
        }
        
        result = geocode_address(normalized_address)
        
        assert result is not None
        # Should return Riyadh city center
        assert result == (24.7136, 46.6753)
    
    def test_fallback_coordinates(self):
        """Test fallback to city center coordinates."""
        # Test with empty address
        normalized_address = {
            'street': None,
            'district': None,
            'city': 'Riyadh',
            'postal_code': None
        }
        
        # This will fallback to city center
        result = geocode_address(normalized_address)
        
        assert result is not None
        assert result[0] == 24.7136
        assert result[1] == 46.6753
    
    @patch('geocode.requests.get')
    def test_reverse_geocode(self, mock_get):
        """Test reverse geocoding with mocked response."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'address': {
                'road': 'King Fahd Road',
                'suburb': 'Al Olaya',
                'city': 'Riyadh',
                'postcode': '12345'
            }
        }
        mock_get.return_value = mock_response
        
        result = reverse_geocode(24.7136, 46.6753)
        
        assert result is not None
        assert result['street'] == 'King Fahd Road'
        assert result['district'] == 'Al Olaya'
        assert result['city'] == 'Riyadh'
        assert result['postal_code'] == '12345'


class TestUtils:
    """Test utility functions."""
    
    def test_clean_arabic_text(self):
        """Test Arabic text cleaning."""
        text = 'الرِّيَاضُ'
        cleaned = clean_arabic_text(text)
        
        assert cleaned == 'الرياض'
        assert 'ِ' not in cleaned  # No diacritics
    
    def test_is_arabic(self):
        """Test Arabic text detection."""
        assert is_arabic('الرياض') is True
        assert is_arabic('Riyadh') is False
        assert is_arabic('الرياض Riyadh') is True
        assert is_arabic('') is False
    
    def test_validate_coordinates(self):
        """Test coordinate validation."""
        assert validate_coordinates(24.7136, 46.6753) is True
        assert validate_coordinates(-90, 180) is True
        assert validate_coordinates(91, 0) is False
        assert validate_coordinates(0, 181) is False
        assert validate_coordinates(None, None) is False
        assert validate_coordinates('invalid', 'coords') is False
    
    def test_get_city_center(self):
        """Test getting city center coordinates."""
        assert get_city_center('Riyadh') == (24.7136, 46.6753)
        assert get_city_center('الرياض') == (24.7136, 46.6753)
        assert get_city_center('Jeddah') == (21.5433, 39.1728)
        assert get_city_center('جدة') == (21.5433, 39.1728)
        assert get_city_center('UnknownCity') == (24.7136, 46.6753)  # Default to Riyadh


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

"""
Tests for the optimizer service.
"""
import pytest
from unittest.mock import Mock, patch
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from optimizer import optimize_routes
from osrm_client import OSRMClient
from utils import haversine_distance, validate_coordinates, parse_time_window


class TestOptimizer:
    """Test cases for route optimization."""
    
    def test_optimize_routes(self):
        """Test basic route optimization with mock data."""
        orders = [
            {
                'orderId': 'order1',
                'deliveryLocation': {
                    'latitude': 31.9522,
                    'longitude': 35.2332
                },
                'priority': 'normal'
            },
            {
                'orderId': 'order2',
                'deliveryLocation': {
                    'latitude': 31.9500,
                    'longitude': 35.2300
                },
                'priority': 'high'
            }
        ]
        
        couriers = [
            {
                'courierId': 'courier1',
                'currentLocation': {
                    'latitude': 31.9550,
                    'longitude': 35.2350
                },
                'available': True
            }
        ]
        
        # Mock OSRM client
        osrm_client = Mock(spec=OSRMClient)
        osrm_client.get_distance_matrix.return_value = {
            'distances': [[0, 500], [500, 0]],
            'durations': [[0, 60], [60, 0]]
        }
        
        routes = optimize_routes(orders, couriers, osrm_client)
        
        assert len(routes) > 0
        assert routes[0]['courierId'] == 'courier1'
        assert len(routes[0]['orders']) == 2
        assert 'totalDistance' in routes[0]
        assert 'totalDuration' in routes[0]
        assert 'estimatedTimes' in routes[0]
    
    def test_optimize_routes_empty_orders(self):
        """Test optimization with no orders."""
        orders = []
        couriers = [
            {
                'courierId': 'courier1',
                'currentLocation': {
                    'latitude': 31.9550,
                    'longitude': 35.2350
                },
                'available': True
            }
        ]
        
        osrm_client = Mock(spec=OSRMClient)
        routes = optimize_routes(orders, couriers, osrm_client)
        
        assert routes == []
    
    def test_optimize_routes_no_couriers(self):
        """Test optimization with no couriers."""
        orders = [
            {
                'orderId': 'order1',
                'deliveryLocation': {
                    'latitude': 31.9522,
                    'longitude': 35.2332
                }
            }
        ]
        couriers = []
        
        osrm_client = Mock(spec=OSRMClient)
        routes = optimize_routes(orders, couriers, osrm_client)
        
        assert routes == []
    
    def test_optimize_routes_invalid_coordinates(self):
        """Test optimization with invalid coordinates."""
        orders = [
            {
                'orderId': 'order1',
                'deliveryLocation': {
                    'latitude': 200,  # Invalid
                    'longitude': 35.2332
                }
            }
        ]
        couriers = [
            {
                'courierId': 'courier1',
                'currentLocation': {
                    'latitude': 31.9550,
                    'longitude': 35.2350
                },
                'available': True
            }
        ]
        
        osrm_client = Mock(spec=OSRMClient)
        routes = optimize_routes(orders, couriers, osrm_client)
        
        assert routes == []


class TestOSRMClient:
    """Test cases for OSRM client."""
    
    @patch('osrm_client.requests.get')
    def test_get_distance_matrix_success(self, mock_get):
        """Test successful distance matrix request."""
        mock_response = Mock()
        mock_response.json.return_value = {
            'code': 'Ok',
            'distances': [[0, 1000], [1000, 0]],
            'durations': [[0, 120], [120, 0]]
        }
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        client = OSRMClient('http://test.osrm.org')
        locations = [(35.2332, 31.9522), (35.2300, 31.9500)]
        result = client.get_distance_matrix(locations)
        
        assert result is not None
        assert 'distances' in result
        assert 'durations' in result
        assert len(result['distances']) == 2
    
    @patch('osrm_client.requests.get')
    def test_get_distance_matrix_fallback(self, mock_get):
        """Test fallback when OSRM fails."""
        mock_get.side_effect = Exception("Connection error")
        
        client = OSRMClient('http://test.osrm.org')
        locations = [(35.2332, 31.9522), (35.2300, 31.9500)]
        result = client.get_distance_matrix(locations)
        
        assert result is not None
        assert 'distances' in result
        assert 'durations' in result
    
    @patch('osrm_client.requests.get')
    def test_get_route_success(self, mock_get):
        """Test successful route request."""
        mock_response = Mock()
        mock_response.json.return_value = {
            'code': 'Ok',
            'routes': [{
                'distance': 1500,
                'duration': 180
            }]
        }
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        client = OSRMClient('http://test.osrm.org')
        waypoints = [(35.2332, 31.9522), (35.2300, 31.9500)]
        result = client.get_route(waypoints)
        
        assert result is not None
        assert result['distance'] == 1500
        assert result['duration'] == 180


class TestUtils:
    """Test cases for utility functions."""
    
    def test_haversine_distance(self):
        """Test haversine distance calculation."""
        # Distance between Amman and Jerusalem (approximately 70 km)
        lat1, lon1 = 31.9522, 35.2332  # Amman
        lat2, lon2 = 31.7683, 35.2137  # Jerusalem
        
        distance = haversine_distance(lat1, lon1, lat2, lon2)
        
        # Should be approximately 20-25 km
        assert 15 < distance < 30
    
    def test_haversine_distance_same_point(self):
        """Test haversine distance for same point."""
        lat, lon = 31.9522, 35.2332
        
        distance = haversine_distance(lat, lon, lat, lon)
        
        assert distance < 0.001  # Very close to zero
    
    def test_validate_coordinates_valid(self):
        """Test coordinate validation with valid values."""
        assert validate_coordinates(31.9522, 35.2332) is True
        assert validate_coordinates(0, 0) is True
        assert validate_coordinates(-90, -180) is True
        assert validate_coordinates(90, 180) is True
    
    def test_validate_coordinates_invalid(self):
        """Test coordinate validation with invalid values."""
        assert validate_coordinates(91, 35.2332) is False
        assert validate_coordinates(-91, 35.2332) is False
        assert validate_coordinates(31.9522, 181) is False
        assert validate_coordinates(31.9522, -181) is False
    
    def test_parse_time_window_valid(self):
        """Test parsing valid ISO datetime."""
        dt = parse_time_window('2024-01-15T10:00:00Z')
        assert dt is not None
        assert dt.year == 2024
        assert dt.month == 1
        assert dt.day == 15
    
    def test_parse_time_window_invalid(self):
        """Test parsing invalid datetime."""
        assert parse_time_window('invalid') is None
        assert parse_time_window(None) is None
        assert parse_time_window('') is None


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

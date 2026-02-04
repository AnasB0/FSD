"""
OSRM client for routing and distance matrix calculations.
Provides integration with OSRM routing service with fallback mechanisms.
"""
import requests
from typing import List, Tuple, Dict, Optional
from utils import haversine_distance, estimate_travel_time


class OSRMClient:
    """Client for interacting with OSRM routing service."""
    
    def __init__(self, base_url: str):
        """
        Initialize OSRM client.
        
        Args:
            base_url: Base URL for OSRM service
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = 10
    
    def get_distance_matrix(
        self, 
        locations: List[Tuple[float, float]]
    ) -> Optional[Dict[str, List[List[float]]]]:
        """
        Get distance and duration matrices for multiple locations.
        
        Args:
            locations: List of (longitude, latitude) tuples
        
        Returns:
            Dict with 'distances' and 'durations' matrices, or None on failure
        """
        if not locations or len(locations) < 2:
            return None
        
        # Build OSRM table service URL
        coords = ';'.join([f"{lon},{lat}" for lon, lat in locations])
        url = f"{self.base_url}/table/v1/driving/{coords}"
        params = {'annotations': 'distance,duration'}
        
        try:
            response = requests.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
            
            if data.get('code') != 'Ok':
                return self._fallback_distance_matrix(locations)
            
            return {
                'distances': data.get('distances', []),
                'durations': data.get('durations', [])
            }
        except (requests.RequestException, ValueError, KeyError):
            return self._fallback_distance_matrix(locations)
    
    def get_route(
        self, 
        waypoints: List[Tuple[float, float]]
    ) -> Optional[Dict[str, float]]:
        """
        Get route information for a sequence of waypoints.
        
        Args:
            waypoints: List of (longitude, latitude) tuples in order
        
        Returns:
            Dict with 'distance' (meters) and 'duration' (seconds), or None on failure
        """
        if not waypoints or len(waypoints) < 2:
            return None
        
        # Build OSRM route service URL
        coords = ';'.join([f"{lon},{lat}" for lon, lat in waypoints])
        url = f"{self.base_url}/route/v1/driving/{coords}"
        params = {'overview': 'false', 'steps': 'false'}
        
        try:
            response = requests.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
            
            if data.get('code') != 'Ok' or not data.get('routes'):
                return self._fallback_route(waypoints)
            
            route = data['routes'][0]
            return {
                'distance': route.get('distance', 0),
                'duration': route.get('duration', 0)
            }
        except (requests.RequestException, ValueError, KeyError):
            return self._fallback_route(waypoints)
    
    def _fallback_distance_matrix(
        self, 
        locations: List[Tuple[float, float]]
    ) -> Dict[str, List[List[float]]]:
        """
        Calculate distance matrix using haversine formula.
        
        Args:
            locations: List of (longitude, latitude) tuples
        
        Returns:
            Dict with 'distances' and 'durations' matrices
        """
        n = len(locations)
        distances = [[0.0] * n for _ in range(n)]
        durations = [[0.0] * n for _ in range(n)]
        
        for i in range(n):
            for j in range(n):
                if i != j:
                    lon1, lat1 = locations[i]
                    lon2, lat2 = locations[j]
                    dist_km = haversine_distance(lat1, lon1, lat2, lon2)
                    distances[i][j] = dist_km * 1000  # Convert to meters
                    durations[i][j] = estimate_travel_time(dist_km) * 60  # Convert to seconds
        
        return {
            'distances': distances,
            'durations': durations
        }
    
    def _fallback_route(
        self, 
        waypoints: List[Tuple[float, float]]
    ) -> Dict[str, float]:
        """
        Calculate route using haversine formula.
        
        Args:
            waypoints: List of (longitude, latitude) tuples
        
        Returns:
            Dict with 'distance' (meters) and 'duration' (seconds)
        """
        total_distance = 0.0
        total_duration = 0.0
        
        for i in range(len(waypoints) - 1):
            lon1, lat1 = waypoints[i]
            lon2, lat2 = waypoints[i + 1]
            dist_km = haversine_distance(lat1, lon1, lat2, lon2)
            total_distance += dist_km * 1000  # Convert to meters
            total_duration += estimate_travel_time(dist_km) * 60  # Convert to seconds
        
        return {
            'distance': total_distance,
            'duration': total_duration
        }

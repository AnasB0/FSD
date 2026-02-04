"""
Route optimization module using nearest neighbor heuristic.
Implements VRP optimization with time windows and capacity constraints.
"""
from typing import List, Dict, Any, Optional
from osrm_client import OSRMClient
from config import Config
from utils import validate_coordinates


def optimize_routes(
    orders: List[Dict[str, Any]], 
    couriers: List[Dict[str, Any]], 
    osrm_client: OSRMClient
) -> List[Dict[str, Any]]:
    """
    Optimize delivery routes using nearest neighbor assignment.
    
    Args:
        orders: List of order dictionaries with location and details
        couriers: List of courier dictionaries with location and availability
        osrm_client: OSRM client for distance/duration calculations
    
    Returns:
        List of route assignments with courier, orders, and metrics
    """
    if not orders:
        return []
    
    if not couriers:
        return []
    
    # Validate and prepare data
    valid_orders = []
    for order in orders:
        location = order.get('deliveryLocation', {})
        lat = location.get('latitude')
        lon = location.get('longitude')
        
        if lat is not None and lon is not None and validate_coordinates(lat, lon):
            valid_orders.append({
                'id': order.get('orderId') or order.get('_id'),
                'latitude': lat,
                'longitude': lon,
                'timeWindow': order.get('timeWindow'),
                'priority': order.get('priority', 'normal'),
                'serviceTime': order.get('serviceTime', Config.DEFAULT_SERVICE_TIME_MINUTES)
            })
    
    valid_couriers = []
    for courier in couriers:
        location = courier.get('currentLocation', {})
        lat = location.get('latitude')
        lon = location.get('longitude')
        
        if lat is not None and lon is not None and validate_coordinates(lat, lon):
            valid_couriers.append({
                'id': courier.get('courierId') or courier.get('_id'),
                'latitude': lat,
                'longitude': lon,
                'capacity': courier.get('capacity', Config.MAX_ORDERS_PER_ROUTE),
                'available': courier.get('available', True)
            })
    
    if not valid_orders or not valid_couriers:
        return []
    
    # Initialize route assignments
    routes = []
    for courier in valid_couriers:
        if courier['available']:
            routes.append({
                'courierId': courier['id'],
                'orders': [],
                'totalDistance': 0.0,
                'totalDuration': 0.0,
                'estimatedTimes': [],
                'currentLocation': {
                    'latitude': courier['latitude'],
                    'longitude': courier['longitude']
                }
            })
    
    if not routes:
        return []
    
    # Assign orders using nearest neighbor heuristic
    unassigned_orders = valid_orders.copy()
    
    while unassigned_orders:
        best_assignment = None
        best_distance = float('inf')
        
        # Find the best order-courier pair
        for route in routes:
            # Check capacity constraint
            if len(route['orders']) >= Config.MAX_ORDERS_PER_ROUTE:
                continue
            
            # Check duration constraint
            max_duration_seconds = Config.MAX_ROUTE_DURATION_HOURS * 3600
            if route['totalDuration'] >= max_duration_seconds:
                continue
            
            current_loc = route['currentLocation']
            
            for order in unassigned_orders:
                # Calculate distance from current location to order
                locations = [
                    (current_loc['longitude'], current_loc['latitude']),
                    (order['longitude'], order['latitude'])
                ]
                
                matrix = osrm_client.get_distance_matrix(locations)
                if not matrix:
                    continue
                
                distance = matrix['distances'][0][1]
                duration = matrix['durations'][0][1]
                
                # Prioritize high priority orders
                priority_weight = 0.5 if order['priority'] == 'high' else 1.0
                weighted_distance = distance * priority_weight
                
                if weighted_distance < best_distance:
                    best_distance = weighted_distance
                    best_assignment = {
                        'route': route,
                        'order': order,
                        'distance': distance,
                        'duration': duration
                    }
        
        # Make the best assignment
        if not best_assignment:
            break
        
        route = best_assignment['route']
        order = best_assignment['order']
        
        # Add order to route
        route['orders'].append(order['id'])
        route['totalDistance'] += best_assignment['distance']
        route['totalDuration'] += best_assignment['duration']
        route['totalDuration'] += order['serviceTime'] * 60  # Add service time
        
        # Calculate ETA
        eta_seconds = route['totalDuration']
        route['estimatedTimes'].append({
            'orderId': order['id'],
            'eta': eta_seconds
        })
        
        # Update current location
        route['currentLocation'] = {
            'latitude': order['latitude'],
            'longitude': order['longitude']
        }
        
        # Remove assigned order
        unassigned_orders.remove(order)
    
    # Clean up routes and convert units
    final_routes = []
    for route in routes:
        if route['orders']:
            final_routes.append({
                'courierId': route['courierId'],
                'orders': route['orders'],
                'totalDistance': round(route['totalDistance'] / 1000, 2),  # Convert to km
                'totalDuration': round(route['totalDuration'] / 60, 2),  # Convert to minutes
                'estimatedTimes': [
                    {
                        'orderId': et['orderId'],
                        'eta': round(et['eta'] / 60, 2)  # Convert to minutes
                    }
                    for et in route['estimatedTimes']
                ]
            })
    
    return final_routes

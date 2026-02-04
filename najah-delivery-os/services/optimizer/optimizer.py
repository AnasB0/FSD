import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta
from utils.osrm import get_distance_matrix
from utils.haversine import haversine_distance

logger = logging.getLogger(__name__)

def assign_couriers_to_orders(orders: List[Dict], couriers: List[Dict]) -> List[Dict]:
    """
    Assign orders to couriers using a simple nearest-available heuristic.
    
    Args:
        orders: List of order dicts with id, location (lat/lng), timeWindow
        couriers: List of courier dicts with id, location (lat/lng), capacity, shift
        
    Returns:
        List of assignment dicts with courierId, orderIds, route, totalDistance, totalDuration, eta
    """
    if not orders or not couriers:
        logger.warning("Empty orders or couriers list")
        return []
    
    # Initialize courier states
    courier_assignments = {
        courier['id']: {
            'courierId': courier['id'],
            'orderIds': [],
            'route': [courier['location']],
            'totalDistance': 0,
            'totalDuration': 0,
            'eta': None,
            'currentLocation': courier['location'],
            'remainingCapacity': courier.get('capacity', 5),
            'shift': courier.get('shift', {})
        }
        for courier in couriers
    }
    
    # Sort orders by time window (earliest first)
    sorted_orders = sorted(orders, key=lambda o: o.get('timeWindow', {}).get('start', '9999'))
    
    # Try to get distance matrix for all locations
    all_locations = [c['location'] for c in couriers] + [o['location'] for o in orders]
    matrix = get_distance_matrix(all_locations)
    
    # Assign each order to nearest available courier
    for order in sorted_orders:
        best_courier_id = None
        min_distance = float('inf')
        
        for courier_id, assignment in courier_assignments.items():
            # Check capacity
            if assignment['remainingCapacity'] <= 0:
                continue
            
            # Calculate distance from courier's current location to order
            if matrix:
                # Find indices
                courier_idx = next(i for i, c in enumerate(couriers) if c['id'] == courier_id)
                order_idx = len(couriers) + sorted_orders.index(order)
                
                # Adjust for already assigned orders (courier moved)
                if assignment['orderIds']:
                    # Use last order location as current
                    last_order_idx = len(couriers) + next(
                        i for i, o in enumerate(sorted_orders) 
                        if o['id'] == assignment['orderIds'][-1]
                    )
                    distance = matrix['distances'][last_order_idx][order_idx]
                else:
                    distance = matrix['distances'][courier_idx][order_idx]
            else:
                # Fallback to haversine
                curr_loc = assignment['currentLocation']
                order_loc = order['location']
                distance = haversine_distance(
                    curr_loc['lat'], curr_loc['lng'],
                    order_loc['lat'], order_loc['lng']
                )
            
            if distance < min_distance:
                min_distance = distance
                best_courier_id = courier_id
        
        # Assign order to best courier
        if best_courier_id:
            assignment = courier_assignments[best_courier_id]
            assignment['orderIds'].append(order['id'])
            assignment['route'].append(order['location'])
            assignment['currentLocation'] = order['location']
            assignment['remainingCapacity'] -= 1
            
            # Estimate duration (assume 30 km/h average speed)
            duration = (min_distance / 1000) / 30 * 3600  # seconds
            assignment['totalDistance'] += min_distance
            assignment['totalDuration'] += duration
        else:
            logger.warning(f"Could not assign order {order['id']} - no available couriers")
    
    # Calculate ETAs and clean up results
    results = []
    for assignment in courier_assignments.values():
        if assignment['orderIds']:
            # Calculate ETA from current time
            eta = datetime.now() + timedelta(seconds=assignment['totalDuration'])
            assignment['eta'] = eta.isoformat()
            
            # Remove internal fields
            del assignment['currentLocation']
            del assignment['remainingCapacity']
            del assignment['shift']
            
            results.append(assignment)
    
    return results


def calculate_route_eta(route: List[Dict], starting_time: datetime = None) -> Dict[str, Any]:
    """
    Calculate ETA for a route.
    
    Args:
        route: List of location dicts with lat/lng
        starting_time: When the route starts (default: now)
        
    Returns:
        Dict with totalDistance, totalDuration, and eta
    """
    if not route or len(route) < 2:
        return {
            'totalDistance': 0,
            'totalDuration': 0,
            'eta': (starting_time or datetime.now()).isoformat()
        }
    
    starting_time = starting_time or datetime.now()
    
    # Try OSRM first
    matrix = get_distance_matrix(route)
    
    total_distance = 0
    total_duration = 0
    
    if matrix and matrix.get('distances') and matrix.get('durations'):
        # Calculate route distance/duration from matrix
        for i in range(len(route) - 1):
            total_distance += matrix['distances'][i][i + 1]
            total_duration += matrix['durations'][i][i + 1]
    else:
        # Fallback to haversine
        logger.info("Using haversine fallback for route calculation")
        for i in range(len(route) - 1):
            loc1 = route[i]
            loc2 = route[i + 1]
            distance = haversine_distance(
                loc1['lat'], loc1['lng'],
                loc2['lat'], loc2['lng']
            )
            total_distance += distance
            # Estimate duration (30 km/h average)
            total_duration += (distance / 1000) / 30 * 3600
    
    eta = starting_time + timedelta(seconds=total_duration)
    
    return {
        'totalDistance': total_distance,
        'totalDuration': total_duration,
        'eta': eta.isoformat()
    }

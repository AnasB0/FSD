import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from optimizer import assign_couriers_to_orders

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'optimizer',
        'version': '1.0.0'
    }), 200


@app.route('/optimize', methods=['POST'])
def optimize():
    """
    Optimize delivery assignments.
    
    Expected JSON body:
    {
        "orders": [
            {
                "id": "order1",
                "location": {"lat": 31.9539, "lng": 35.9106},
                "timeWindow": {"start": "09:00", "end": "12:00"}
            }
        ],
        "couriers": [
            {
                "id": "courier1",
                "location": {"lat": 31.9522, "lng": 35.9330},
                "capacity": 5,
                "shift": {"start": "08:00", "end": "16:00"}
            }
        ]
    }
    
    Returns:
    {
        "assignments": [
            {
                "courierId": "courier1",
                "orderIds": ["order1", "order2"],
                "route": [{"lat": 31.9522, "lng": 35.9330}, ...],
                "totalDistance": 5000,
                "totalDuration": 600,
                "eta": "2024-01-15T12:30:00"
            }
        ]
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        orders = data.get('orders', [])
        couriers = data.get('couriers', [])
        
        # Validate input
        if not orders:
            return jsonify({'error': 'No orders provided'}), 400
        
        if not couriers:
            return jsonify({'error': 'No couriers provided'}), 400
        
        # Validate order structure
        for order in orders:
            if 'id' not in order or 'location' not in order:
                return jsonify({'error': 'Invalid order structure - missing id or location'}), 400
            if 'lat' not in order['location'] or 'lng' not in order['location']:
                return jsonify({'error': 'Invalid order location - missing lat or lng'}), 400
        
        # Validate courier structure
        for courier in couriers:
            if 'id' not in courier or 'location' not in courier:
                return jsonify({'error': 'Invalid courier structure - missing id or location'}), 400
            if 'lat' not in courier['location'] or 'lng' not in courier['location']:
                return jsonify({'error': 'Invalid courier location - missing lat or lng'}), 400
        
        logger.info(f"Optimizing {len(orders)} orders for {len(couriers)} couriers")
        
        # Perform optimization
        assignments = assign_couriers_to_orders(orders, couriers)
        
        logger.info(f"Created {len(assignments)} assignments")
        
        return jsonify({
            'assignments': assignments,
            'summary': {
                'totalOrders': len(orders),
                'totalCouriers': len(couriers),
                'assignedOrders': sum(len(a['orderIds']) for a in assignments),
                'activeCouriers': len(assignments)
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in optimize endpoint: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error', 'message': str(e)}), 500


if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5003))
    debug = os.getenv('FLASK_ENV', 'production') == 'development'
    
    logger.info(f"Starting Optimizer service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)

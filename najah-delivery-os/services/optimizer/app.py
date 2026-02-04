"""
Flask application for the Optimizer service.
Provides REST API endpoints for route optimization.
"""
from flask import Flask, request, jsonify
from dotenv import load_dotenv
import os
from typing import Dict, Any

from config import Config
from optimizer import optimize_routes
from osrm_client import OSRMClient

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Validate configuration
try:
    Config.validate()
except ValueError as e:
    print(f"Configuration error: {e}")
    exit(1)

# Initialize OSRM client
osrm_client = OSRMClient(Config.OSRM_BASE_URL)


@app.route('/health', methods=['GET'])
def health_check() -> Dict[str, Any]:
    """
    Health check endpoint.
    
    Returns:
        JSON response with service status
    """
    return jsonify({
        'status': 'healthy',
        'service': 'optimizer',
        'version': '1.0.0'
    }), 200


@app.route('/optimize', methods=['POST'])
def optimize() -> Dict[str, Any]:
    """
    Optimize delivery routes for given orders and couriers.
    
    Expected JSON body:
        {
            "orders": [...],
            "couriers": [...]
        }
    
    Returns:
        JSON response with optimized routes
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'error': 'Invalid request',
                'message': 'Request body must be JSON'
            }), 400
        
        orders = data.get('orders', [])
        couriers = data.get('couriers', [])
        
        if not isinstance(orders, list):
            return jsonify({
                'error': 'Invalid request',
                'message': 'orders must be an array'
            }), 400
        
        if not isinstance(couriers, list):
            return jsonify({
                'error': 'Invalid request',
                'message': 'couriers must be an array'
            }), 400
        
        if not orders:
            return jsonify({
                'routes': [],
                'message': 'No orders to optimize'
            }), 200
        
        if not couriers:
            return jsonify({
                'error': 'Invalid request',
                'message': 'At least one courier is required'
            }), 400
        
        # Perform optimization
        routes = optimize_routes(orders, couriers, osrm_client)
        
        return jsonify({
            'routes': routes,
            'totalRoutes': len(routes),
            'totalOrders': sum(len(r['orders']) for r in routes)
        }), 200
    
    except Exception as e:
        app.logger.error(f"Optimization error: {str(e)}")
        return jsonify({
            'error': 'Optimization failed',
            'message': str(e)
        }), 500


@app.errorhandler(404)
def not_found(error) -> Dict[str, Any]:
    """Handle 404 errors."""
    return jsonify({
        'error': 'Not found',
        'message': 'The requested resource was not found'
    }), 404


@app.errorhandler(500)
def internal_error(error) -> Dict[str, Any]:
    """Handle 500 errors."""
    return jsonify({
        'error': 'Internal server error',
        'message': 'An unexpected error occurred'
    }), 500


if __name__ == '__main__':
    port = Config.OPTIMIZER_PORT
    app.run(host='0.0.0.0', port=port, debug=os.getenv('FLASK_DEBUG', 'False') == 'True')

"""
Geocoding Service API
Provides address normalization and geocoding for Najah Delivery OS
"""
import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from normalizer import parse_address, format_address_for_geocoding
from geocode import geocode_address, reverse_geocode

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

# Configuration
app.config['JSON_AS_ASCII'] = False  # Support Arabic characters in JSON


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'geocoding',
        'version': '1.0.0'
    }), 200


@app.route('/normalize', methods=['POST'])
def normalize():
    """
    Normalize and geocode an address.
    
    Request body:
    {
        "address": {
            "ar": "شارع الملك فهد، حي العليا، الرياض 12345",
            "en": "King Fahd Street, Al Olaya, Riyadh"
        }
        OR
        "address": "شارع الملك فهد، حي العليا، الرياض"
    }
    
    Response:
    {
        "normalized": {
            "street": "الملك فهد",
            "district": "العليا",
            "city": "Riyadh",
            "postal_code": "12345",
            "country": "Saudi Arabia"
        },
        "location": {
            "lat": 24.7136,
            "lng": 46.6753
        },
        "display_name": "King Fahd Street, Al Olaya, Riyadh, Saudi Arabia",
        "confidence": 0.85
    }
    """
    try:
        # Parse request
        data = request.get_json()
        
        if not data or 'address' not in data:
            logger.warning("Missing 'address' field in request")
            return jsonify({
                'error': 'Missing required field: address'
            }), 400
        
        address_input = data['address']
        
        logger.info(f"Received normalization request: {address_input}")
        
        # Parse and normalize address
        normalized = parse_address(address_input)
        
        logger.info(f"Normalized address: {normalized}")
        
        # Format for geocoding
        geocode_query = format_address_for_geocoding(normalized)
        
        # Geocode the address
        location_data = geocode_address(geocode_query)
        
        # Prepare response
        response = {
            'normalized': normalized,
            'location': {
                'lat': location_data['lat'],
                'lng': location_data['lng']
            },
            'display_name': location_data['display_name'],
            'confidence': location_data['confidence']
        }
        
        logger.info(f"Successfully processed request with confidence: {location_data['confidence']}")
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error processing request: {e}", exc_info=True)
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@app.route('/geocode', methods=['POST'])
def geocode():
    """
    Geocode a plain address string.
    
    Request body:
    {
        "address": "King Fahd Street, Riyadh, Saudi Arabia"
    }
    
    Response:
    {
        "location": {
            "lat": 24.7136,
            "lng": 46.6753
        },
        "display_name": "King Fahd Street, Riyadh, Saudi Arabia",
        "confidence": 0.85
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'address' not in data:
            return jsonify({
                'error': 'Missing required field: address'
            }), 400
        
        address = data['address']
        
        logger.info(f"Geocoding request: {address}")
        
        # Geocode the address
        location_data = geocode_address(address)
        
        response = {
            'location': {
                'lat': location_data['lat'],
                'lng': location_data['lng']
            },
            'display_name': location_data['display_name'],
            'confidence': location_data['confidence']
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error in geocoding: {e}", exc_info=True)
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@app.route('/reverse', methods=['POST'])
def reverse():
    """
    Reverse geocode coordinates to an address.
    
    Request body:
    {
        "lat": 24.7136,
        "lng": 46.6753
    }
    
    Response:
    {
        "display_name": "King Fahd Street, Al Olaya, Riyadh, Saudi Arabia",
        "address": {
            "street": "King Fahd Street",
            "district": "Al Olaya",
            "city": "Riyadh",
            "postal_code": "12345",
            "country": "Saudi Arabia"
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'lat' not in data or 'lng' not in data:
            return jsonify({
                'error': 'Missing required fields: lat, lng'
            }), 400
        
        lat = float(data['lat'])
        lng = float(data['lng'])
        
        logger.info(f"Reverse geocoding request: ({lat}, {lng})")
        
        result = reverse_geocode(lat, lng)
        
        return jsonify(result), 200
        
    except (ValueError, TypeError) as e:
        logger.error(f"Invalid coordinates: {e}")
        return jsonify({
            'error': 'Invalid coordinates format'
        }), 400
        
    except Exception as e:
        logger.error(f"Error in reverse geocoding: {e}", exc_info=True)
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    logger.info(f"Starting Geocoding Service on port {port}")
    
    app.run(host='0.0.0.0', port=port, debug=debug)

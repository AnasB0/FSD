"""Flask application for the Geocoding service."""

from flask import Flask, request, jsonify
from dotenv import load_dotenv
from typing import Dict, Any
from config import get_config
from normalizer import normalize_address
from geocode import geocode_address, reverse_geocode
from utils import validate_coordinates

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
config = get_config()


@app.route('/health', methods=['GET'])
def health_check() -> tuple[Dict[str, str], int]:
    """Health check endpoint.
    
    Returns:
        JSON response with service status and HTTP 200.
    """
    return jsonify({'status': 'healthy', 'service': 'geocoding'}), 200


@app.route('/normalize', methods=['POST'])
def normalize() -> tuple[Dict[str, Any], int]:
    """Normalize and geocode an address.
    
    Expected JSON body:
        {
            "ar": "Arabic address text (optional)",
            "en": "English address text (optional)",
            "components": {
                "street": "...",
                "district": "...",
                "city": "...",
                "postal_code": "..."
            } (optional),
            "country": "SA" (optional, default: SA)
        }
    
    Returns:
        JSON response with normalized address and coordinates.
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        # Validate that at least one address format is provided
        if not any(key in data for key in ['ar', 'en', 'components']):
            return jsonify({
                'error': 'At least one of "ar", "en", or "components" is required'
            }), 400
        
        # Normalize the address
        normalized = normalize_address(data)
        
        # Get country code
        country = data.get('country', config.DEFAULT_COUNTRY)
        
        # Geocode the normalized address
        coordinates = geocode_address(normalized, country)
        
        response = {
            'normalized_address': normalized,
            'coordinates': None,
            'fallback': False
        }
        
        if coordinates:
            response['coordinates'] = {
                'latitude': coordinates[0],
                'longitude': coordinates[1]
            }
            # Check if it's a fallback (city center)
            city = normalized.get('city') or config.DEFAULT_CITY
            from utils import get_city_center
            city_center = get_city_center(city)
            if coordinates == city_center:
                response['fallback'] = True
        
        return jsonify(response), 200
    
    except Exception as e:
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500


@app.route('/reverse', methods=['POST'])
def reverse() -> tuple[Dict[str, Any], int]:
    """Reverse geocode coordinates to get address.
    
    Expected JSON body:
        {
            "latitude": 24.7136,
            "longitude": 46.6753
        }
    
    Returns:
        JSON response with address components.
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        
        if latitude is None or longitude is None:
            return jsonify({'error': 'Both latitude and longitude are required'}), 400
        
        if not validate_coordinates(latitude, longitude):
            return jsonify({'error': 'Invalid coordinates'}), 400
        
        # Reverse geocode
        address = reverse_geocode(float(latitude), float(longitude))
        
        if address:
            return jsonify({'address': address}), 200
        else:
            return jsonify({'error': 'Reverse geocoding failed'}), 404
    
    except Exception as e:
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500


@app.errorhandler(404)
def not_found(error) -> tuple[Dict[str, str], int]:
    """Handle 404 errors.
    
    Returns:
        JSON error response with HTTP 404.
    """
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(405)
def method_not_allowed(error) -> tuple[Dict[str, str], int]:
    """Handle 405 errors.
    
    Returns:
        JSON error response with HTTP 405.
    """
    return jsonify({'error': 'Method not allowed'}), 405


@app.errorhandler(500)
def internal_error(error) -> tuple[Dict[str, str], int]:
    """Handle 500 errors.
    
    Returns:
        JSON error response with HTTP 500.
    """
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=config.GEOCODING_PORT,
        debug=False
    )

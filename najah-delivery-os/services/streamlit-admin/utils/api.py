import requests
import streamlit as st
from config import EXPRESS_API_URL

def call_api(endpoint, method='GET', data=None, token=None):
    """
    Makes HTTP requests to the Express API.
    
    Args:
        endpoint: API endpoint path (e.g., '/orders')
        method: HTTP method (GET, POST, PUT, DELETE)
        data: Request body data (for POST/PUT)
        token: Optional authentication token
    
    Returns:
        Response data or None on error
    """
    url = f"{EXPRESS_API_URL}{endpoint}"
    headers = {'Content-Type': 'application/json'}
    
    if token:
        headers['Authorization'] = f'Bearer {token}'
    
    try:
        if method == 'GET':
            response = requests.get(url, headers=headers, timeout=10)
        elif method == 'POST':
            response = requests.post(url, json=data, headers=headers, timeout=10)
        elif method == 'PUT':
            response = requests.put(url, json=data, headers=headers, timeout=10)
        elif method == 'DELETE':
            response = requests.delete(url, headers=headers, timeout=10)
        else:
            st.error(f"Unsupported HTTP method: {method}")
            return None
        
        response.raise_for_status()
        return response.json()
    
    except requests.exceptions.Timeout:
        st.error(f"Request timeout for {url}")
        return None
    except requests.exceptions.RequestException as e:
        st.error(f"API request failed: {str(e)}")
        return None
    except Exception as e:
        st.error(f"Unexpected error: {str(e)}")
        return None

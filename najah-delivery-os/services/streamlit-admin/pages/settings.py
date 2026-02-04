import streamlit as st
import json
from utils.db import get_mongo_client
from utils.api import call_api
from config import MONGO_URI, EXPRESS_API_URL, STREAMLIT_ADMIN_PORT

def show():
    st.title("⚙️ Settings")
    
    st.markdown("---")
    
    tab1, tab2, tab3 = st.tabs(["Optimization Parameters", "Webhook Secrets", "System Health"])
    
    with tab1:
        show_optimization_settings()
    
    with tab2:
        show_webhook_settings()
    
    with tab3:
        show_system_health()

def show_optimization_settings():
    """Display and edit optimization parameters."""
    st.subheader("Route Optimization Parameters")
    
    st.info("Configure parameters for the route optimization algorithm")
    
    col1, col2 = st.columns(2)
    
    with col1:
        max_orders_per_courier = st.number_input(
            "Max Orders per Courier",
            min_value=1,
            max_value=50,
            value=10,
            help="Maximum number of orders a courier can handle in one route"
        )
        
        max_route_duration = st.number_input(
            "Max Route Duration (minutes)",
            min_value=30,
            max_value=480,
            value=240,
            help="Maximum duration for a single route"
        )
        
        optimization_interval = st.number_input(
            "Optimization Interval (minutes)",
            min_value=5,
            max_value=120,
            value=15,
            help="How often to run automatic route optimization"
        )
    
    with col2:
        priority_weight = st.slider(
            "Priority Weight",
            min_value=0.0,
            max_value=1.0,
            value=0.3,
            step=0.1,
            help="Weight given to order priority in optimization"
        )
        
        distance_weight = st.slider(
            "Distance Weight",
            min_value=0.0,
            max_value=1.0,
            value=0.5,
            step=0.1,
            help="Weight given to total distance in optimization"
        )
        
        time_weight = st.slider(
            "Time Weight",
            min_value=0.0,
            max_value=1.0,
            value=0.2,
            step=0.1,
            help="Weight given to delivery time windows in optimization"
        )
    
    st.markdown("---")
    
    if st.button("💾 Save Optimization Settings", type="primary"):
        settings = {
            'maxOrdersPerCourier': max_orders_per_courier,
            'maxRouteDuration': max_route_duration,
            'optimizationInterval': optimization_interval,
            'priorityWeight': priority_weight,
            'distanceWeight': distance_weight,
            'timeWeight': time_weight
        }
        save_optimization_settings(settings)

def save_optimization_settings(settings):
    """Save optimization settings."""
    try:
        response = call_api('/settings/optimization', method='POST', data=settings)
        
        if response:
            st.success("✅ Optimization settings saved successfully")
        else:
            st.error("Failed to save settings")
    
    except Exception as e:
        st.error(f"Error saving settings: {str(e)}")

def show_webhook_settings():
    """Display webhook secrets management."""
    st.subheader("Webhook Secrets Management")
    
    st.info("Manage webhook authentication secrets for external integrations")
    
    webhook_services = ["merchant_portal", "courier_app", "customer_app", "payment_gateway"]
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        selected_service = st.selectbox("Service", webhook_services)
        webhook_secret = st.text_input(
            "Webhook Secret",
            type="password",
            placeholder="Enter webhook secret"
        )
    
    with col2:
        st.write("")
        st.write("")
        if st.button("Generate Secret", use_container_width=True):
            import secrets
            new_secret = secrets.token_urlsafe(32)
            st.code(new_secret)
            st.success("New secret generated (copy it now)")
    
    if st.button("💾 Save Webhook Secret", type="primary"):
        if webhook_secret:
            save_webhook_secret(selected_service, webhook_secret)
        else:
            st.warning("Please enter a webhook secret")
    
    st.markdown("---")
    
    st.subheader("Current Webhook Endpoints")
    
    endpoints = [
        {"service": "Merchant Portal", "endpoint": f"{EXPRESS_API_URL}/webhooks/merchant"},
        {"service": "Courier App", "endpoint": f"{EXPRESS_API_URL}/webhooks/courier"},
        {"service": "Customer App", "endpoint": f"{EXPRESS_API_URL}/webhooks/customer"},
        {"service": "Payment Gateway", "endpoint": f"{EXPRESS_API_URL}/webhooks/payment"}
    ]
    
    for endpoint in endpoints:
        st.code(f"{endpoint['service']}: {endpoint['endpoint']}")

def save_webhook_secret(service, secret):
    """Save webhook secret."""
    try:
        response = call_api(
            '/settings/webhook-secrets',
            method='POST',
            data={'service': service, 'secret': secret}
        )
        
        if response:
            st.success(f"✅ Webhook secret saved for {service}")
        else:
            st.error("Failed to save webhook secret")
    
    except Exception as e:
        st.error(f"Error saving webhook secret: {str(e)}")

def show_system_health():
    """Display system health checks."""
    st.subheader("System Health Status")
    
    col1, col2 = st.columns(2)
    
    with col1:
        if st.button("🔍 Check System Health", use_container_width=True):
            check_system_health()
    
    with col2:
        if st.button("🔄 Refresh Status", use_container_width=True):
            st.rerun()
    
    st.markdown("---")
    
    st.subheader("Service Status")
    
    check_mongodb_status()
    check_api_status()
    check_streamlit_status()

def check_system_health():
    """Run comprehensive system health check."""
    with st.spinner("Running health checks..."):
        mongodb_ok = check_mongodb_status()
        api_ok = check_api_status()
        
        if mongodb_ok and api_ok:
            st.success("✅ All systems operational")
        else:
            st.error("⚠️ Some systems are experiencing issues")

def check_mongodb_status():
    """Check MongoDB connection status."""
    try:
        client = get_mongo_client()
        
        if client is None:
            st.error("❌ MongoDB: Connection failed")
            return False
        
        client.admin.command('ping')
        
        db_name = MONGO_URI.split('/')[-1].split('?')[0]
        db = client[db_name]
        collections = db.list_collection_names()
        
        col1, col2 = st.columns([1, 3])
        with col1:
            st.success("✅ MongoDB")
        with col2:
            st.write(f"Connected to `{db_name}` with {len(collections)} collections")
        
        return True
    
    except Exception as e:
        st.error(f"❌ MongoDB: {str(e)}")
        return False

def check_api_status():
    """Check Express API status."""
    try:
        response = call_api('/health')
        
        if response:
            col1, col2 = st.columns([1, 3])
            with col1:
                st.success("✅ Express API")
            with col2:
                st.write(f"Connected to `{EXPRESS_API_URL}`")
            return True
        else:
            st.error(f"❌ Express API: No response from {EXPRESS_API_URL}")
            return False
    
    except Exception as e:
        st.error(f"❌ Express API: {str(e)}")
        return False

def check_streamlit_status():
    """Display Streamlit admin status."""
    col1, col2 = st.columns([1, 3])
    with col1:
        st.success("✅ Streamlit Admin")
    with col2:
        st.write(f"Running on port `{STREAMLIT_ADMIN_PORT}`")

import streamlit as st
import pandas as pd
from datetime import datetime
from utils.db import get_collection
from utils.api import call_api

def show():
    st.title("🗺️ Route Plans Management")
    
    st.markdown("---")
    
    col1, col2 = st.columns([3, 1])
    
    with col1:
        st.write("Manage and optimize delivery route plans")
    
    with col2:
        if st.button("🔄 Refresh", use_container_width=True):
            st.cache_data.clear()
            st.rerun()
    
    route_plans_df = load_route_plans()
    
    if route_plans_df is None:
        st.error("Failed to load route plans. Please check your database connection.")
        return
    
    if route_plans_df.empty:
        st.info("No route plans found in the system.")
        return
    
    st.markdown("---")
    
    display_route_plans_stats(route_plans_df)
    
    st.markdown("---")
    
    display_route_plans_table(route_plans_df)
    
    st.markdown("---")
    
    show_route_actions()

@st.cache_data(ttl=30)
def load_route_plans():
    """Load route plans from MongoDB."""
    try:
        collection = get_collection('routeplans')
        if collection is None:
            return None
        
        route_plans = list(collection.find().sort('createdAt', -1).limit(100))
        
        if not route_plans:
            return pd.DataFrame()
        
        for plan in route_plans:
            plan['_id'] = str(plan['_id'])
            if 'createdAt' in plan:
                plan['createdAt'] = pd.to_datetime(plan['createdAt'])
        
        return pd.DataFrame(route_plans)
    
    except Exception as e:
        st.error(f"Error loading route plans: {str(e)}")
        return None

def display_route_plans_stats(route_plans_df):
    """Display route plan statistics."""
    col1, col2, col3, col4 = st.columns(4)
    
    total_plans = len(route_plans_df)
    active_plans = 0
    completed_plans = 0
    total_orders = 0
    
    if 'status' in route_plans_df.columns:
        active_plans = len(route_plans_df[route_plans_df['status'] == 'active'])
        completed_plans = len(route_plans_df[route_plans_df['status'] == 'completed'])
    
    if 'orders' in route_plans_df.columns:
        total_orders = route_plans_df['orders'].apply(lambda x: len(x) if isinstance(x, list) else 0).sum()
    
    with col1:
        st.metric("Total Plans", total_plans)
    
    with col2:
        st.metric("Active Plans", active_plans)
    
    with col3:
        st.metric("Completed Plans", completed_plans)
    
    with col4:
        st.metric("Total Orders", int(total_orders))

def display_route_plans_table(route_plans_df):
    """Display route plans in a table."""
    st.subheader("Route Plans")
    
    display_df = route_plans_df.copy()
    
    if 'orders' in display_df.columns:
        display_df['orderCount'] = display_df['orders'].apply(lambda x: len(x) if isinstance(x, list) else 0)
    else:
        display_df['orderCount'] = 0
    
    if 'totalDistance' in display_df.columns:
        display_df['distance_km'] = display_df['totalDistance'].apply(lambda x: f"{x:.2f}" if pd.notna(x) else "N/A")
    
    if 'estimatedDuration' in display_df.columns:
        display_df['duration_min'] = display_df['estimatedDuration'].apply(lambda x: f"{x:.0f}" if pd.notna(x) else "N/A")
    
    columns_to_show = ['_id', 'courierId', 'status', 'orderCount', 'distance_km', 'duration_min', 'createdAt']
    columns_to_show = [col for col in columns_to_show if col in display_df.columns]
    
    if columns_to_show:
        display_df = display_df[columns_to_show]
    
    if 'createdAt' in display_df.columns:
        display_df['createdAt'] = display_df['createdAt'].dt.strftime('%Y-%m-%d %H:%M')
    
    display_df = display_df.rename(columns={
        '_id': 'Plan ID',
        'courierId': 'Courier ID',
        'status': 'Status',
        'orderCount': 'Orders',
        'distance_km': 'Distance (km)',
        'duration_min': 'Duration (min)',
        'createdAt': 'Created'
    })
    
    st.dataframe(
        display_df,
        use_container_width=True,
        hide_index=True,
        height=400
    )

def show_route_actions():
    """Route plan actions section."""
    st.subheader("Route Plan Actions")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.write("**Trigger Global Re-optimization**")
        st.write("This will re-optimize all pending and active route plans based on current conditions.")
        
        if st.button("🔄 Re-optimize All Routes", use_container_width=True, type="primary"):
            trigger_global_reoptimization()
    
    with col2:
        st.write("**View Route Details**")
        route_plan_id = st.text_input("Route Plan ID", placeholder="Enter route plan ID")
        
        if st.button("View Details", use_container_width=True):
            if route_plan_id:
                show_route_details(route_plan_id)
            else:
                st.warning("Please enter a route plan ID")

def trigger_global_reoptimization():
    """Trigger global route re-optimization."""
    try:
        with st.spinner("Triggering re-optimization..."):
            response = call_api('/routes/optimize', method='POST')
        
        if response:
            st.success("✅ Global route re-optimization triggered successfully")
            st.cache_data.clear()
            st.rerun()
        else:
            st.error("Failed to trigger re-optimization")
    
    except Exception as e:
        st.error(f"Error triggering re-optimization: {str(e)}")

def show_route_details(route_plan_id):
    """Display detailed information about a route plan."""
    try:
        collection = get_collection('routeplans')
        if collection is None:
            return
        
        from bson import ObjectId
        route_plan = collection.find_one({'_id': ObjectId(route_plan_id)})
        
        if not route_plan:
            st.error(f"Route plan {route_plan_id} not found")
            return
        
        st.success(f"Route Plan Details for {route_plan_id}")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.write("**Courier ID:**", route_plan.get('courierId', 'N/A'))
            st.write("**Status:**", route_plan.get('status', 'N/A'))
        
        with col2:
            st.write("**Total Distance:**", f"{route_plan.get('totalDistance', 0):.2f} km")
            st.write("**Duration:**", f"{route_plan.get('estimatedDuration', 0):.0f} min")
        
        with col3:
            st.write("**Created:**", route_plan.get('createdAt', 'N/A'))
            st.write("**Updated:**", route_plan.get('updatedAt', 'N/A'))
        
        st.markdown("---")
        
        orders = route_plan.get('orders', [])
        if orders:
            st.subheader(f"Orders in Route ({len(orders)})")
            
            orders_df = pd.DataFrame([
                {
                    'Order ID': order.get('orderId', 'N/A'),
                    'Sequence': order.get('sequence', 'N/A'),
                    'Status': order.get('status', 'N/A')
                }
                for order in orders
            ])
            
            st.dataframe(orders_df, use_container_width=True, hide_index=True)
        else:
            st.info("No orders in this route plan")
        
        if 'route' in route_plan:
            st.subheader("Route Path")
            st.json(route_plan['route'])
    
    except Exception as e:
        st.error(f"Error loading route plan details: {str(e)}")

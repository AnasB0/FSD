import streamlit as st
import pandas as pd
import plotly.express as px
from utils.db import get_collection
from utils.api import call_api

def show():
    st.title("🚴 Couriers Management")
    
    st.markdown("---")
    
    col1, col2 = st.columns([3, 1])
    
    with col2:
        if st.button("🔄 Refresh", use_container_width=True):
            st.cache_data.clear()
            st.rerun()
    
    couriers_df = load_couriers()
    
    if couriers_df is None:
        st.error("Failed to load couriers. Please check your database connection.")
        return
    
    if couriers_df.empty:
        st.info("No couriers found in the system.")
        return
    
    st.markdown("---")
    
    display_couriers_stats(couriers_df)
    
    st.markdown("---")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        display_couriers_table(couriers_df)
    
    with col2:
        display_courier_map(couriers_df)
    
    st.markdown("---")
    
    show_manual_override_section(couriers_df)

@st.cache_data(ttl=30)
def load_couriers():
    """Load couriers from MongoDB."""
    try:
        collection = get_collection('couriers')
        if collection is None:
            return None
        
        couriers = list(collection.find())
        
        if not couriers:
            return pd.DataFrame()
        
        for courier in couriers:
            courier['_id'] = str(courier['_id'])
        
        return pd.DataFrame(couriers)
    
    except Exception as e:
        st.error(f"Error loading couriers: {str(e)}")
        return None

def display_couriers_stats(couriers_df):
    """Display courier statistics."""
    col1, col2, col3, col4 = st.columns(4)
    
    total_couriers = len(couriers_df)
    active_couriers = 0
    busy_couriers = 0
    offline_couriers = 0
    
    if 'status' in couriers_df.columns:
        active_couriers = len(couriers_df[couriers_df['status'] == 'active'])
        busy_couriers = len(couriers_df[couriers_df['status'] == 'busy'])
        offline_couriers = len(couriers_df[couriers_df['status'] == 'offline'])
    
    with col1:
        st.metric("Total Couriers", total_couriers)
    
    with col2:
        st.metric("Active", active_couriers, delta=None, delta_color="normal")
    
    with col3:
        st.metric("Busy", busy_couriers, delta=None, delta_color="off")
    
    with col4:
        st.metric("Offline", offline_couriers, delta=None, delta_color="inverse")

def display_couriers_table(couriers_df):
    """Display couriers in a table."""
    st.subheader("Couriers List")
    
    display_df = couriers_df.copy()
    
    columns_to_show = ['_id', 'name', 'status', 'assignedOrders']
    columns_to_show = [col for col in columns_to_show if col in display_df.columns]
    
    if 'assignedOrders' not in display_df.columns:
        display_df['assignedOrders'] = 0
    
    if 'currentLocation' in display_df.columns:
        display_df['location'] = display_df['currentLocation'].apply(
            lambda x: f"{x.get('lat', 'N/A'):.4f}, {x.get('lng', 'N/A'):.4f}" 
            if isinstance(x, dict) else 'N/A'
        )
        columns_to_show.append('location')
    
    if columns_to_show:
        display_df = display_df[columns_to_show]
    
    display_df = display_df.rename(columns={
        '_id': 'Courier ID',
        'name': 'Name',
        'status': 'Status',
        'assignedOrders': 'Assigned Orders',
        'location': 'Current Location'
    })
    
    st.dataframe(
        display_df,
        use_container_width=True,
        hide_index=True,
        height=400
    )

def display_courier_map(couriers_df):
    """Display courier positions on a map."""
    st.subheader("Courier Locations")
    
    if 'currentLocation' not in couriers_df.columns:
        st.info("No location data available")
        return
    
    map_data = []
    for idx, row in couriers_df.iterrows():
        loc = row.get('currentLocation')
        if isinstance(loc, dict) and 'lat' in loc and 'lng' in loc:
            map_data.append({
                'lat': loc['lat'],
                'lon': loc['lng'],
                'name': row.get('name', 'Unknown'),
                'status': row.get('status', 'unknown')
            })
    
    if not map_data:
        st.info("No couriers with location data")
        return
    
    map_df = pd.DataFrame(map_data)
    
    color_map = {
        'active': 'green',
        'busy': 'orange',
        'offline': 'gray'
    }
    map_df['color'] = map_df['status'].map(color_map).fillna('blue')
    
    fig = px.scatter_mapbox(
        map_df,
        lat='lat',
        lon='lon',
        hover_name='name',
        hover_data={'status': True, 'lat': False, 'lon': False, 'color': False},
        color='status',
        color_discrete_map=color_map,
        zoom=11,
        height=400
    )
    
    fig.update_layout(
        mapbox_style="open-street-map",
        margin={"r": 0, "t": 0, "l": 0, "b": 0}
    )
    
    st.plotly_chart(fig, use_container_width=True)

def show_manual_override_section(couriers_df):
    """Manual order assignment/unassignment."""
    st.subheader("Manual Order Assignment")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        courier_ids = couriers_df['_id'].tolist() if '_id' in couriers_df.columns else []
        selected_courier = st.selectbox("Select Courier", [""] + courier_ids)
    
    with col2:
        order_id = st.text_input("Order ID", placeholder="Enter order ID")
    
    with col3:
        st.write("")
        st.write("")
        action_col1, action_col2 = st.columns(2)
        
        with action_col1:
            if st.button("Assign", use_container_width=True):
                if selected_courier and order_id:
                    assign_order(selected_courier, order_id)
                else:
                    st.warning("Please select a courier and enter an order ID")
        
        with action_col2:
            if st.button("Unassign", use_container_width=True):
                if order_id:
                    unassign_order(order_id)
                else:
                    st.warning("Please enter an order ID")

def assign_order(courier_id, order_id):
    """Manually assign an order to a courier."""
    try:
        response = call_api(
            f'/orders/{order_id}/assign',
            method='POST',
            data={'courierId': courier_id}
        )
        
        if response:
            st.success(f"Order {order_id} assigned to courier {courier_id}")
            st.cache_data.clear()
        else:
            st.error("Failed to assign order")
    
    except Exception as e:
        st.error(f"Error assigning order: {str(e)}")

def unassign_order(order_id):
    """Manually unassign an order from a courier."""
    try:
        response = call_api(
            f'/orders/{order_id}/unassign',
            method='POST'
        )
        
        if response:
            st.success(f"Order {order_id} unassigned")
            st.cache_data.clear()
        else:
            st.error("Failed to unassign order")
    
    except Exception as e:
        st.error(f"Error unassigning order: {str(e)}")

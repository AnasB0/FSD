import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
from utils.db import get_collection
from utils.api import call_api

def show():
    st.title("📊 Dashboard")
    
    col1, col2 = st.columns([3, 1])
    with col2:
        if st.button("🔄 Refresh", use_container_width=True):
            st.cache_data.clear()
            st.rerun()
    
    st.markdown("---")
    
    orders_data = load_orders_data()
    couriers_data = load_couriers_data()
    
    if orders_data is None or couriers_data is None:
        st.error("Failed to load data. Please check your database connection.")
        return
    
    show_kpi_metrics(orders_data, couriers_data)
    
    st.markdown("---")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        show_orders_by_status(orders_data)
    
    with col2:
        show_deliveries_by_city(orders_data)
    
    with col3:
        show_hourly_trends(orders_data)

@st.cache_data(ttl=60)
def load_orders_data():
    """Load orders from MongoDB."""
    try:
        collection = get_collection('orders')
        if collection is None:
            return None
        
        orders = list(collection.find())
        if not orders:
            return pd.DataFrame()
        
        for order in orders:
            order['_id'] = str(order['_id'])
        
        return pd.DataFrame(orders)
    except Exception as e:
        st.error(f"Error loading orders: {str(e)}")
        return None

@st.cache_data(ttl=60)
def load_couriers_data():
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

def show_kpi_metrics(orders_df, couriers_df):
    """Display KPI metrics."""
    col1, col2, col3, col4 = st.columns(4)
    
    total_orders = len(orders_df) if not orders_df.empty else 0
    active_couriers = len(couriers_df[couriers_df.get('status') == 'active']) if not couriers_df.empty and 'status' in couriers_df.columns else 0
    
    pending_deliveries = 0
    completed_today = 0
    
    if not orders_df.empty and 'status' in orders_df.columns:
        pending_deliveries = len(orders_df[orders_df['status'].isin(['pending', 'assigned', 'picked_up'])])
        
        if 'deliveredAt' in orders_df.columns:
            today = datetime.now().date()
            orders_df['deliveredAt'] = pd.to_datetime(orders_df['deliveredAt'], errors='coerce')
            completed_today = len(orders_df[
                (orders_df['status'] == 'delivered') &
                (orders_df['deliveredAt'].dt.date == today)
            ])
    
    with col1:
        st.metric("Total Orders", total_orders, delta=None)
    
    with col2:
        st.metric("Active Couriers", active_couriers, delta=None)
    
    with col3:
        st.metric("Pending Deliveries", pending_deliveries, delta=None)
    
    with col4:
        st.metric("Completed Today", completed_today, delta=None)

def show_orders_by_status(orders_df):
    """Display pie chart of orders by status."""
    st.subheader("Orders by Status")
    
    if orders_df.empty or 'status' not in orders_df.columns:
        st.info("No order data available")
        return
    
    status_counts = orders_df['status'].value_counts()
    
    fig = px.pie(
        values=status_counts.values,
        names=status_counts.index,
        title="",
        hole=0.4
    )
    fig.update_traces(textposition='inside', textinfo='percent+label')
    fig.update_layout(height=300, showlegend=False)
    
    st.plotly_chart(fig, use_container_width=True)

def show_deliveries_by_city(orders_df):
    """Display bar chart of deliveries by city."""
    st.subheader("Deliveries by City")
    
    if orders_df.empty or 'deliveryAddress' not in orders_df.columns:
        st.info("No delivery data available")
        return
    
    city_data = []
    for addr in orders_df['deliveryAddress'].dropna():
        if isinstance(addr, dict) and 'city' in addr:
            city_data.append(addr['city'])
    
    if not city_data:
        st.info("No city data available")
        return
    
    city_counts = pd.Series(city_data).value_counts().head(10)
    
    fig = px.bar(
        x=city_counts.values,
        y=city_counts.index,
        orientation='h',
        title=""
    )
    fig.update_layout(
        height=300,
        xaxis_title="Orders",
        yaxis_title="City",
        showlegend=False
    )
    
    st.plotly_chart(fig, use_container_width=True)

def show_hourly_trends(orders_df):
    """Display line chart of hourly order trends."""
    st.subheader("Hourly Trends")
    
    if orders_df.empty or 'createdAt' not in orders_df.columns:
        st.info("No trend data available")
        return
    
    orders_df['createdAt'] = pd.to_datetime(orders_df['createdAt'], errors='coerce')
    orders_df['hour'] = orders_df['createdAt'].dt.hour
    
    hourly_counts = orders_df['hour'].value_counts().sort_index()
    
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=hourly_counts.index,
        y=hourly_counts.values,
        mode='lines+markers',
        line=dict(color='#1f77b4', width=2),
        marker=dict(size=6)
    ))
    
    fig.update_layout(
        height=300,
        xaxis_title="Hour of Day",
        yaxis_title="Orders",
        showlegend=False,
        xaxis=dict(tickmode='linear', tick0=0, dtick=2)
    )
    
    st.plotly_chart(fig, use_container_width=True)

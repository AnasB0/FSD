import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
from utils.db import get_collection
from utils.api import call_api

def show():
    st.title("📦 Orders Management")
    
    st.markdown("---")
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        status_filter = st.selectbox(
            "Status",
            ["All", "pending", "assigned", "picked_up", "in_transit", "delivered", "cancelled"]
        )
    
    with col2:
        date_range = st.selectbox(
            "Date Range",
            ["Today", "Last 7 Days", "Last 30 Days", "All Time"]
        )
    
    with col3:
        merchant_filter = st.text_input("Merchant ID", placeholder="Filter by merchant")
    
    with col4:
        st.write("")
        st.write("")
        if st.button("Export to CSV", use_container_width=True):
            export_orders()
    
    st.markdown("---")
    
    orders_df = load_orders(status_filter, date_range, merchant_filter)
    
    if orders_df is None:
        st.error("Failed to load orders. Please check your database connection.")
        return
    
    if orders_df.empty:
        st.info("No orders found matching the filters.")
        return
    
    display_orders_table(orders_df)

@st.cache_data(ttl=30)
def load_orders(status_filter, date_range, merchant_filter):
    """Load orders from MongoDB with filters."""
    try:
        collection = get_collection('orders')
        if collection is None:
            return None
        
        query = {}
        
        if status_filter != "All":
            query['status'] = status_filter
        
        if merchant_filter:
            query['merchantId'] = merchant_filter
        
        if date_range != "All Time":
            now = datetime.now()
            if date_range == "Today":
                start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            elif date_range == "Last 7 Days":
                start_date = now - timedelta(days=7)
            elif date_range == "Last 30 Days":
                start_date = now - timedelta(days=30)
            
            query['createdAt'] = {'$gte': start_date}
        
        orders = list(collection.find(query).sort('createdAt', -1).limit(1000))
        
        if not orders:
            return pd.DataFrame()
        
        for order in orders:
            order['_id'] = str(order['_id'])
            if 'createdAt' in order:
                order['createdAt'] = pd.to_datetime(order['createdAt'])
        
        return pd.DataFrame(orders)
    
    except Exception as e:
        st.error(f"Error loading orders: {str(e)}")
        return None

def display_orders_table(orders_df):
    """Display orders in an interactive table."""
    display_df = orders_df.copy()
    
    columns_to_show = ['_id', 'status', 'merchantId', 'customerId', 'totalAmount', 'createdAt']
    columns_to_show = [col for col in columns_to_show if col in display_df.columns]
    
    if columns_to_show:
        display_df = display_df[columns_to_show]
    
    if 'createdAt' in display_df.columns:
        display_df['createdAt'] = display_df['createdAt'].dt.strftime('%Y-%m-%d %H:%M')
    
    display_df = display_df.rename(columns={
        '_id': 'Order ID',
        'status': 'Status',
        'merchantId': 'Merchant',
        'customerId': 'Customer',
        'totalAmount': 'Amount',
        'createdAt': 'Created'
    })
    
    st.dataframe(
        display_df,
        use_container_width=True,
        hide_index=True,
        height=400
    )
    
    st.markdown("---")
    
    st.subheader("Order Actions")
    
    col1, col2 = st.columns(2)
    
    with col1:
        order_id = st.text_input("Order ID", placeholder="Enter order ID")
    
    with col2:
        action_col1, action_col2 = st.columns(2)
        
        with action_col1:
            if st.button("View Details", use_container_width=True):
                if order_id:
                    show_order_details(order_id)
                else:
                    st.warning("Please enter an order ID")
        
        with action_col2:
            if st.button("Re-plan Route", use_container_width=True):
                if order_id:
                    replan_route(order_id)
                else:
                    st.warning("Please enter an order ID")

def show_order_details(order_id):
    """Display detailed information about an order."""
    try:
        collection = get_collection('orders')
        if collection is None:
            return
        
        from bson import ObjectId
        order = collection.find_one({'_id': ObjectId(order_id)})
        
        if not order:
            st.error(f"Order {order_id} not found")
            return
        
        st.success(f"Order Details for {order_id}")
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.write("**Status:**", order.get('status', 'N/A'))
            st.write("**Merchant:**", order.get('merchantId', 'N/A'))
            st.write("**Customer:**", order.get('customerId', 'N/A'))
            st.write("**Amount:**", f"${order.get('totalAmount', 0):.2f}")
        
        with col2:
            st.write("**Courier:**", order.get('courierId', 'Not assigned'))
            st.write("**Created:**", order.get('createdAt', 'N/A'))
            st.write("**Route Plan:**", order.get('routePlanId', 'Not planned'))
        
        if 'deliveryAddress' in order:
            st.write("**Delivery Address:**")
            addr = order['deliveryAddress']
            if isinstance(addr, dict):
                st.json(addr)
            else:
                st.write(addr)
    
    except Exception as e:
        st.error(f"Error loading order details: {str(e)}")

def replan_route(order_id):
    """Trigger route re-planning for an order."""
    try:
        response = call_api(f'/routes/replan/{order_id}', method='POST')
        
        if response:
            st.success(f"Route re-planning triggered for order {order_id}")
            st.cache_data.clear()
        else:
            st.error("Failed to trigger route re-planning")
    
    except Exception as e:
        st.error(f"Error re-planning route: {str(e)}")

def export_orders():
    """Export orders to CSV."""
    try:
        collection = get_collection('orders')
        if collection is None:
            st.error("Cannot export: Database not available")
            return
        
        orders = list(collection.find())
        
        if not orders:
            st.warning("No orders to export")
            return
        
        for order in orders:
            order['_id'] = str(order['_id'])
        
        df = pd.DataFrame(orders)
        csv = df.to_csv(index=False)
        
        st.download_button(
            label="Download CSV",
            data=csv,
            file_name=f"orders_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
            mime="text/csv"
        )
    
    except Exception as e:
        st.error(f"Error exporting orders: {str(e)}")

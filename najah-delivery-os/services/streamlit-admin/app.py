import streamlit as st
from pages import dashboard, orders, couriers, route_plans, settings

st.set_page_config(
    page_title="Najah Delivery Admin",
    page_icon="🚚",
    layout="wide",
    initial_sidebar_state="expanded"
)

def main():
    st.sidebar.title("🚚 Najah Delivery Admin")
    st.sidebar.markdown("---")
    
    page = st.sidebar.radio(
        "Navigation",
        ["Dashboard", "Orders", "Couriers", "Route Plans", "Settings"],
        index=0
    )
    
    st.sidebar.markdown("---")
    st.sidebar.info("Operations Dashboard for Najah Delivery System")
    
    if page == "Dashboard":
        dashboard.show()
    elif page == "Orders":
        orders.show()
    elif page == "Couriers":
        couriers.show()
    elif page == "Route Plans":
        route_plans.show()
    elif page == "Settings":
        settings.show()

if __name__ == "__main__":
    main()

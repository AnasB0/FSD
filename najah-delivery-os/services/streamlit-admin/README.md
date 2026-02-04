# Streamlit Admin Dashboard

## Overview

The Streamlit Admin Dashboard is a web-based operations and administration interface for the Najah Delivery OS. It provides real-time monitoring, management, and control of the delivery system.

## Features

### 📊 Dashboard
- Real-time KPI metrics (total orders, active couriers, pending deliveries, completed today)
- Interactive charts and visualizations:
  - Orders by status (pie chart)
  - Deliveries by city (bar chart)
  - Hourly order trends (line chart)
- Auto-refresh capability

### 📦 Orders Management
- Comprehensive order listing with filters:
  - Status filter (pending, assigned, in_transit, delivered, cancelled)
  - Date range filter (today, last 7 days, last 30 days, all time)
  - Merchant ID filter
- Order details viewer
- Manual route re-planning
- Export to CSV functionality

### 🚴 Couriers Management
- Live courier tracking with status indicators
- Interactive map showing courier locations
- Courier statistics and metrics
- Manual order assignment/unassignment
- Real-time courier status monitoring

### 🗺️ Route Plans
- Route plan listing with key metrics
- Global route re-optimization trigger
- Detailed route view with order sequences
- Distance and duration tracking
- Route status monitoring

### ⚙️ Settings
- **Optimization Parameters**: Configure route optimization algorithm settings
- **Webhook Secrets**: Manage authentication secrets for external integrations
- **System Health**: Monitor MongoDB, Express API, and Streamlit status

## Prerequisites

- Python 3.11+
- MongoDB instance
- Express API service running
- Required Python packages (see requirements.txt)

## Installation

### Local Development

1. **Clone the repository**
```bash
cd najah-delivery-os/services/streamlit-admin
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. **Run the application**
```bash
streamlit run app.py
```

The dashboard will be available at `http://localhost:8501`

### Docker Deployment

1. **Build the Docker image**
```bash
docker build -t najah-streamlit-admin .
```

2. **Run the container**
```bash
docker run -p 8501:8501 \
  -e MONGO_URI="mongodb://mongo:27017/najah_delivery" \
  -e EXPRESS_API_URL="http://express-api:3000/api" \
  najah-streamlit-admin
```

### Docker Compose

Add to your `docker-compose.yml`:

```yaml
streamlit-admin:
  build: ./services/streamlit-admin
  ports:
    - "8501:8501"
  environment:
    - MONGO_URI=mongodb://mongo:27017/najah_delivery
    - EXPRESS_API_URL=http://express-api:3000/api
    - STREAMLIT_ADMIN_PORT=8501
  depends_on:
    - mongo
    - express-api
  networks:
    - najah-network
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/najah_delivery` |
| `EXPRESS_API_URL` | Express API base URL | `http://localhost:3000/api` |
| `STREAMLIT_ADMIN_PORT` | Port to run Streamlit on | `8501` |

### Configuration File

Edit `config.py` to modify default settings or add new configuration options.

## Project Structure

```
streamlit-admin/
├── app.py                 # Main application entry point
├── config.py             # Configuration loader
├── requirements.txt      # Python dependencies
├── Dockerfile           # Docker configuration
├── .env.example         # Environment variables template
├── pages/               # Application pages
│   ├── __init__.py
│   ├── dashboard.py     # Dashboard with KPIs and charts
│   ├── orders.py        # Orders management
│   ├── couriers.py      # Couriers tracking
│   ├── route_plans.py   # Route plans management
│   └── settings.py      # System settings
└── utils/               # Utility modules
    ├── __init__.py
    ├── db.py           # MongoDB helper functions
    └── api.py          # Express API client
```

## Usage

### Accessing the Dashboard

1. Navigate to `http://localhost:8501` (or your configured host/port)
2. Use the sidebar to navigate between different sections
3. Click refresh buttons to update data in real-time

### Managing Orders

1. Go to the **Orders** section
2. Apply filters to find specific orders
3. Click "View Details" to see order information
4. Use "Re-plan Route" to trigger route optimization
5. Export filtered orders to CSV for reporting

### Monitoring Couriers

1. Go to the **Couriers** section
2. View courier locations on the interactive map
3. Monitor courier status and assigned orders
4. Use manual override to assign/unassign orders

### Optimizing Routes

1. Go to the **Route Plans** section
2. Review existing route plans and metrics
3. Click "Re-optimize All Routes" to trigger global optimization
4. View route details to see order sequences

### Configuring System

1. Go to the **Settings** section
2. Adjust optimization parameters as needed
3. Manage webhook secrets for integrations
4. Check system health status

## API Integration

The dashboard communicates with the Express API through the `utils/api.py` module:

```python
from utils.api import call_api

# GET request
data = call_api('/orders')

# POST request
result = call_api('/routes/optimize', method='POST', data={'param': 'value'})

# With authentication
response = call_api('/admin/settings', method='PUT', data=settings, token=auth_token)
```

## Database Access

The dashboard connects to MongoDB through the `utils/db.py` module:

```python
from utils.db import get_collection

# Get collection
orders_collection = get_collection('orders')

# Query data
orders = list(orders_collection.find({'status': 'pending'}))
```

## Performance Optimization

- **Caching**: Data is cached using `@st.cache_data` with 30-60 second TTL
- **Pagination**: Large datasets are limited to prevent performance issues
- **Connection pooling**: MongoDB client is cached using `@st.cache_resource`
- **Lazy loading**: Data is loaded only when needed

## Security Considerations

- **Environment variables**: Never commit `.env` file to version control
- **Webhook secrets**: Use strong, randomly generated secrets
- **API authentication**: Implement token-based authentication for production
- **Input validation**: All user inputs are validated before processing
- **Error handling**: Sensitive information is not exposed in error messages

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to MongoDB
```
Solution: Check MONGO_URI in .env file and ensure MongoDB is running
```

**Problem**: Cannot reach Express API
```
Solution: Verify EXPRESS_API_URL and ensure the API service is accessible
```

### Performance Issues

**Problem**: Dashboard is slow to load
```
Solution: 
- Reduce data query limits
- Increase cache TTL
- Check MongoDB indexes
- Monitor system resources
```

### Data Not Updating

**Problem**: Dashboard shows stale data
```
Solution: 
- Click refresh button
- Clear cache with st.cache_data.clear()
- Check database connection
```

## Development

### Adding New Pages

1. Create new file in `pages/` directory
2. Implement `show()` function
3. Import and add to navigation in `app.py`

Example:
```python
# pages/new_page.py
import streamlit as st

def show():
    st.title("New Page")
    st.write("Content here")
```

### Adding New API Endpoints

Update `utils/api.py` or create specialized API functions:

```python
def get_custom_data():
    return call_api('/custom/endpoint', method='GET')
```

## Testing

### Manual Testing
```bash
# Run the application
streamlit run app.py

# Test each page and feature
# Verify data loads correctly
# Check error handling
```

### Integration Testing
```bash
# Ensure MongoDB is running
# Ensure Express API is running
# Test end-to-end workflows
```

## Monitoring

- Monitor Streamlit logs for errors
- Check MongoDB connection status in Settings > System Health
- Verify API connectivity regularly
- Monitor resource usage (CPU, memory)

## Contributing

1. Follow PEP 8 style guidelines
2. Add docstrings to all functions
3. Handle errors gracefully
4. Test changes thoroughly
5. Update documentation as needed

## Support

For issues or questions:
- Check the troubleshooting section
- Review application logs
- Verify configuration settings
- Contact system administrator

## License

Part of the Najah Delivery OS project.

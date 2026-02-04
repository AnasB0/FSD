import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import OrderCard from '../components/OrderCard';

function MyRoute() {
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState('');
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    fetchRoute();
    const routeInterval = setInterval(fetchRoute, 60000);
    const locationInterval = setInterval(sendLocationUpdate, 30000);

    return () => {
      clearInterval(routeInterval);
      clearInterval(locationInterval);
    };
  }, []);

  const fetchRoute = async () => {
    try {
      const response = await client.get('/couriers/me/route');
      setRoute(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch route:', err);
      setLoading(false);
    }
  };

  const sendLocationUpdate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            await client.post('/tracking/update', {
              location: {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              },
              timestamp: new Date().toISOString()
            });
            setLocationStatus(t('location_update_sent'));
            setTimeout(() => setLocationStatus(''), 3000);
          } catch (err) {
            console.error('Failed to send location:', err);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  };

  const handleMarkDelivered = async (orderId) => {
    try {
      await client.patch(`/orders/${orderId}/status`, { status: 'delivered' });
      fetchRoute();
    } catch (err) {
      console.error('Failed to mark as delivered:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="route-container">
      <header className="route-header">
        <h1>{t('my_route')}</h1>
        <button onClick={handleLogout} className="btn-secondary">
          {t('logout')}
        </button>
      </header>

      {locationStatus && (
        <div className="status-message">{locationStatus}</div>
      )}

      {!route || !route.orders || route.orders.length === 0 ? (
        <div className="no-route">
          <p>{t('no_route')}</p>
        </div>
      ) : (
        <div className="route-content">
          <h2>{t('orders_to_deliver')}</h2>
          <div className="orders-list">
            {route.orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onMarkDelivered={handleMarkDelivered}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MyRoute;

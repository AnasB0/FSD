import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import Map from '../components/Map';

function RoutePlans() {
  const { t } = useTranslation();
  const [routePlans, setRoutePlans] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);

  useEffect(() => {
    fetchRoutePlans();
  }, []);

  const fetchRoutePlans = async () => {
    try {
      const response = await client.get('/route-plans');
      setRoutePlans(response.data);
    } catch (error) {
      console.error('Failed to fetch route plans:', error);
    }
  };

  return (
    <div className="route-plans">
      <h1>{t('route_plans')}</h1>
      <div className="route-plans-grid">
        <div className="route-list">
          {routePlans.map((route) => (
            <div 
              key={route.id} 
              className="route-card"
              onClick={() => setSelectedRoute(route)}
            >
              <h3>{t('courier')}: {route.courier_name}</h3>
              <p>{t('orders_count')}: {route.orders_count}</p>
              <p>{t('distance')}: {route.distance_km} km</p>
              <p>{t('duration')}: {route.duration_minutes} min</p>
            </div>
          ))}
        </div>
        <div className="route-map">
          {selectedRoute && (
            <Map 
              markers={selectedRoute.waypoints}
              route={selectedRoute.route_geometry}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default RoutePlans;

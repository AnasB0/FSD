import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { routesAPI } from '../services/api';
import Map from '../components/Map';

function RoutePlans() {
  const { t } = useTranslation();
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      const response = await routesAPI.getAll();
      setRoutes(response.data);
    } catch (error) {
      console.error('Error fetching routes:', error);
      setRoutes([
        {
          id: 'route-1',
          name: 'Morning Route A',
          driver: 'Ahmed',
          stops: 8,
          coordinates: [
            [46.6753, 24.7136],
            [46.7219, 24.7453],
            [46.6919, 24.7853],
          ],
        },
        {
          id: 'route-2',
          name: 'Afternoon Route B',
          driver: 'Mohammed',
          stops: 12,
          coordinates: [
            [46.6753, 24.7136],
            [46.6319, 24.6953],
            [46.6119, 24.6553],
          ],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeRoute = async (route) => {
    try {
      await routesAPI.optimize({ routeId: route.id });
      alert(`Route ${route.name} optimized`);
      fetchRoutes();
    } catch (error) {
      console.error('Error optimizing route:', error);
      alert('Failed to optimize route');
    }
  };

  const handleViewRoute = (route) => {
    setSelectedRoute(route);
  };

  return (
    <div className="page route-plans-page">
      <h2 className="page-title">{t('route_plans')}</h2>
      
      {loading ? (
        <div className="loading">{t('loading')}</div>
      ) : (
        <div className="route-plans-container">
          <div className="route-list">
            {routes.length === 0 ? (
              <div className="empty-state">{t('no_routes')}</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('route_name')}</th>
                    <th>{t('driver')}</th>
                    <th>{t('stops')}</th>
                    <th>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((route) => (
                    <tr key={route.id}>
                      <td>{route.name}</td>
                      <td>{route.driver}</td>
                      <td>{route.stops}</td>
                      <td>
                        <button
                          onClick={() => handleViewRoute(route)}
                          className="btn btn-sm btn-secondary"
                        >
                          {t('view_route')}
                        </button>
                        <button
                          onClick={() => handleOptimizeRoute(route)}
                          className="btn btn-sm btn-primary"
                          style={{ marginLeft: '8px' }}
                        >
                          {t('optimize_route')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="route-map">
            <Map
              center={[46.6753, 24.7136]}
              zoom={11}
              routes={selectedRoute ? [selectedRoute] : routes}
              markers={
                selectedRoute
                  ? selectedRoute.coordinates.map((coord, idx) => ({
                      coordinates: coord,
                      title: `Stop ${idx + 1}`,
                      color: '#10b981',
                    }))
                  : []
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default RoutePlans;

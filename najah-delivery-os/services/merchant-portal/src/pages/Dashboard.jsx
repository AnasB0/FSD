import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { statsAPI } from '../services/api';
import Map from '../components/Map';

function Dashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    activeDrivers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await statsAPI.getDashboard();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        totalOrders: 156,
        pendingOrders: 23,
        completedOrders: 128,
        activeDrivers: 12,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page dashboard-page">
      <h2 className="page-title">{t('dashboard')}</h2>
      
      {loading ? (
        <div className="loading">{t('loading')}</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <h3 className="stat-label">{t('total_orders')}</h3>
              <p className="stat-value">{stats.totalOrders}</p>
            </div>
            <div className="stat-card">
              <h3 className="stat-label">{t('pending_orders')}</h3>
              <p className="stat-value">{stats.pendingOrders}</p>
            </div>
            <div className="stat-card">
              <h3 className="stat-label">{t('completed_orders')}</h3>
              <p className="stat-value">{stats.completedOrders}</p>
            </div>
            <div className="stat-card">
              <h3 className="stat-label">{t('active_drivers')}</h3>
              <p className="stat-value">{stats.activeDrivers}</p>
            </div>
          </div>

          <div className="map-section">
            <h3>{t('route_plans')}</h3>
            <Map
              center={[46.6753, 24.7136]}
              zoom={11}
              markers={[
                {
                  coordinates: [46.6753, 24.7136],
                  title: 'Riyadh Center',
                  color: '#3b82f6',
                },
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;

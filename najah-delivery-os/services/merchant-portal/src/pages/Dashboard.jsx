import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import client from '../api/client';

function Dashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    total_orders: 0,
    active_couriers: 0,
    pending_routes: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await client.get('/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="dashboard">
      <h1>{t('dashboard')}</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>{t('total_orders')}</h3>
          <p className="stat-value">{stats.total_orders}</p>
        </div>
        <div className="stat-card">
          <h3>{t('active_couriers')}</h3>
          <p className="stat-value">{stats.active_couriers}</p>
        </div>
        <div className="stat-card">
          <h3>{t('pending_routes')}</h3>
          <p className="stat-value">{stats.pending_routes}</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

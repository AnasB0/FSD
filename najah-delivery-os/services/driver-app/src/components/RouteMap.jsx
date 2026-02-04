import { useTranslation } from 'react-i18next'

function RouteMap({ deliveries }) {
  const { t } = useTranslation()

  const pendingCount = deliveries.filter(d => d.status === 'pending').length
  const inProgressCount = deliveries.filter(d => d.status === 'in_progress').length
  const completedCount = deliveries.filter(d => d.status === 'completed').length

  return (
    <div className="route-map">
      <div className="map-placeholder">
        <div className="map-icon">📍</div>
        <p>Map View</p>
      </div>
      
      <div className="route-stats">
        <div className="stat-item">
          <span className="stat-value">{pendingCount}</span>
          <span className="stat-label">{t('pending')}</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{inProgressCount}</span>
          <span className="stat-label">{t('inProgress')}</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{completedCount}</span>
          <span className="stat-label">{t('completed')}</span>
        </div>
      </div>
    </div>
  )
}

export default RouteMap

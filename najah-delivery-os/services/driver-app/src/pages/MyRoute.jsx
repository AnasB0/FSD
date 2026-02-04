import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getMyRoute, updateDeliveryStatus } from '../services/api'
import { startLocationTracking, stopLocationTracking } from '../services/location'
import RouteMap from '../components/RouteMap'
import DeliveryCard from '../components/DeliveryCard'

function MyRoute() {
  const [route, setRoute] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { t } = useTranslation()

  useEffect(() => {
    loadRoute()
  }, [])

  useEffect(() => {
    if (route && route.status === 'in_progress') {
      startLocationTracking()
      return () => stopLocationTracking()
    }
  }, [route])

  const loadRoute = async () => {
    try {
      setLoading(true)
      const data = await getMyRoute()
      setRoute(data)
      setError('')
    } catch (err) {
      setError(t('networkError'))
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (deliveryId, newStatus) => {
    try {
      await updateDeliveryStatus(deliveryId, newStatus)
      await loadRoute()
    } catch (err) {
      setError(t('networkError'))
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>{t('loadingRoute')}</p>
      </div>
    )
  }

  if (!route || !route.deliveries || route.deliveries.length === 0) {
    return (
      <div className="empty-state">
        <p>{t('noActiveRoute')}</p>
      </div>
    )
  }

  return (
    <div className="my-route-page">
      {route.status === 'in_progress' && (
        <div className="tracking-indicator">
          <span className="tracking-dot"></span>
          {t('locationTracking')}
        </div>
      )}

      <RouteMap deliveries={route.deliveries} />

      <div className="deliveries-section">
        <h2>{t('deliveries')} ({route.deliveries.length})</h2>
        {error && <div className="error-message">{error}</div>}
        
        <div className="deliveries-list">
          {route.deliveries.map((delivery) => (
            <DeliveryCard
              key={delivery.id}
              delivery={delivery}
              onStatusUpdate={handleStatusUpdate}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default MyRoute

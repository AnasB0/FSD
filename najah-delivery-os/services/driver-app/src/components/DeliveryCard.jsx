import { useTranslation } from 'react-i18next'

function DeliveryCard({ delivery, onStatusUpdate }) {
  const { t } = useTranslation()

  const getStatusClass = (status) => {
    const classes = {
      pending: 'status-pending',
      in_progress: 'status-in-progress',
      completed: 'status-completed',
      failed: 'status-failed'
    }
    return classes[status] || ''
  }

  const handleStartDelivery = () => {
    onStatusUpdate(delivery.id, 'in_progress')
  }

  const handleMarkDelivered = () => {
    onStatusUpdate(delivery.id, 'completed')
  }

  const handleMarkFailed = () => {
    onStatusUpdate(delivery.id, 'failed')
  }

  return (
    <div className={`delivery-card ${getStatusClass(delivery.status)}`}>
      <div className="delivery-header">
        <span className="delivery-id">#{delivery.id}</span>
        <span className={`delivery-status ${getStatusClass(delivery.status)}`}>
          {t(delivery.status)}
        </span>
      </div>

      <div className="delivery-info">
        <div className="info-row">
          <strong>{t('customerName')}:</strong>
          <span>{delivery.customer_name || 'N/A'}</span>
        </div>
        <div className="info-row">
          <strong>{t('phoneNumber')}:</strong>
          <span>{delivery.customer_phone || 'N/A'}</span>
        </div>
        <div className="info-row">
          <strong>{t('deliveryAddress')}:</strong>
          <span>{delivery.delivery_address}</span>
        </div>
        {delivery.items && delivery.items.length > 0 && (
          <div className="info-row">
            <strong>{t('orderItems')}:</strong>
            <span>{delivery.items.length} items</span>
          </div>
        )}
      </div>

      <div className="delivery-actions">
        {delivery.status === 'pending' && (
          <button onClick={handleStartDelivery} className="btn-primary">
            {t('startDelivery')}
          </button>
        )}
        {delivery.status === 'in_progress' && (
          <>
            <button onClick={handleMarkDelivered} className="btn-success">
              {t('markDelivered')}
            </button>
            <button onClick={handleMarkFailed} className="btn-danger">
              {t('markFailed')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default DeliveryCard

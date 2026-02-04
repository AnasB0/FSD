import { useTranslation } from 'react-i18next';

function OrderCard({ order, onMarkDelivered }) {
  const { t } = useTranslation();

  const getStatusClass = (status) => {
    switch (status) {
      case 'delivered':
        return 'status-delivered';
      case 'in_transit':
        return 'status-transit';
      default:
        return 'status-pending';
    }
  };

  return (
    <div className="order-card">
      <div className="order-header">
        <h3>Order #{order.id}</h3>
        <span className={`status-badge ${getStatusClass(order.status)}`}>
          {t(order.status)}
        </span>
      </div>
      
      <div className="order-details">
        <div className="detail-row">
          <span className="label">{t('customer')}:</span>
          <span className="value">{order.customerName}</span>
        </div>
        <div className="detail-row">
          <span className="label">{t('address')}:</span>
          <span className="value">{order.deliveryAddress}</span>
        </div>
      </div>

      {order.status !== 'delivered' && (
        <button
          onClick={() => onMarkDelivered(order.id)}
          className="btn-primary"
        >
          {t('mark_delivered')}
        </button>
      )}
    </div>
  );
}

export default OrderCard;

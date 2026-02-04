import React from 'react';
import { useTranslation } from 'react-i18next';

function OrderList({ orders, onViewDetails, onAssignDriver }) {
  const { t } = useTranslation();

  if (!orders || orders.length === 0) {
    return <div className="empty-state">{t('no_orders')}</div>;
  }

  return (
    <div className="order-list">
      <table className="table">
        <thead>
          <tr>
            <th>{t('order_id')}</th>
            <th>{t('customer')}</th>
            <th>{t('address')}</th>
            <th>{t('status')}</th>
            <th>{t('actions')}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>#{order.id}</td>
              <td>{order.customerName || 'N/A'}</td>
              <td>{order.address || 'N/A'}</td>
              <td>
                <span className={`status status-${order.status}`}>
                  {t(order.status)}
                </span>
              </td>
              <td>
                <button
                  onClick={() => onViewDetails(order)}
                  className="btn btn-sm btn-secondary"
                >
                  {t('view_details')}
                </button>
                {order.status === 'pending' && (
                  <button
                    onClick={() => onAssignDriver(order)}
                    className="btn btn-sm btn-primary"
                    style={{ marginLeft: '8px' }}
                  >
                    {t('assign_driver')}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default OrderList;

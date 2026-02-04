import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import client from '../api/client';

function Orders() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await client.get('/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const handleNormalize = async (orderId) => {
    try {
      await client.post(`/orders/${orderId}/normalize`);
      fetchOrders();
    } catch (error) {
      console.error('Failed to normalize order:', error);
    }
  };

  const handlePlanRoute = async (orderId) => {
    try {
      await client.post(`/orders/${orderId}/plan-route`);
      fetchOrders();
    } catch (error) {
      console.error('Failed to plan route:', error);
    }
  };

  return (
    <div className="orders">
      <h1>{t('orders')}</h1>
      <table className="orders-table">
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
              <td>{order.id}</td>
              <td>{order.customer_name}</td>
              <td>{order.address}</td>
              <td>{t(order.status)}</td>
              <td>
                <button onClick={() => handleNormalize(order.id)} className="btn-small">
                  {t('normalize')}
                </button>
                <button onClick={() => handlePlanRoute(order.id)} className="btn-small">
                  {t('plan_route')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Orders;

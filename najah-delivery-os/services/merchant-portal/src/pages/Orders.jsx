import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ordersAPI } from '../services/api';
import OrderList from '../components/OrderList';

function Orders() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await ordersAPI.getAll();
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([
        {
          id: '12345',
          customerName: 'Ahmed Ali',
          address: 'King Fahd Road, Riyadh',
          status: 'pending',
        },
        {
          id: '12346',
          customerName: 'Fatima Hassan',
          address: 'Olaya Street, Riyadh',
          status: 'in_transit',
        },
        {
          id: '12347',
          customerName: 'Mohammed Saleh',
          address: 'Al Malqa, Riyadh',
          status: 'delivered',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (order) => {
    alert(`Viewing details for order #${order.id}`);
  };

  const handleAssignDriver = async (order) => {
    try {
      await ordersAPI.assignDriver(order.id, 'driver-1');
      alert(`Driver assigned to order #${order.id}`);
      fetchOrders();
    } catch (error) {
      console.error('Error assigning driver:', error);
      alert('Failed to assign driver');
    }
  };

  return (
    <div className="page orders-page">
      <h2 className="page-title">{t('orders')}</h2>
      
      {loading ? (
        <div className="loading">{t('loading')}</div>
      ) : (
        <OrderList
          orders={orders}
          onViewDetails={handleViewDetails}
          onAssignDriver={handleAssignDriver}
        />
      )}
    </div>
  );
}

export default Orders;

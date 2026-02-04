import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      login: 'Login',
      dashboard: 'Dashboard',
      orders: 'Orders',
      route_plans: 'Route Plans',
      assistant: 'AI Assistant',
      logout: 'Logout',
      email: 'Email',
      password: 'Password',
      submit: 'Submit',
      total_orders: 'Total Orders',
      active_couriers: 'Active Couriers',
      pending_routes: 'Pending Routes',
      order_id: 'Order ID',
      customer: 'Customer',
      address: 'Address',
      status: 'Status',
      actions: 'Actions',
      normalize: 'Normalize',
      plan_route: 'Plan Route',
      courier: 'Courier',
      orders_count: 'Orders Count',
      distance: 'Distance',
      duration: 'Duration',
      ask_question: 'Ask a question...',
      send: 'Send',
      language: 'Language',
      pending: 'Pending',
      normalized: 'Normalized',
      assigned: 'Assigned',
      in_transit: 'In Transit',
      delivered: 'Delivered'
    }
  },
  ar: {
    translation: {
      login: 'تسجيل الدخول',
      dashboard: 'لوحة التحكم',
      orders: 'الطلبات',
      route_plans: 'خطط المسارات',
      assistant: 'المساعد الذكي',
      logout: 'تسجيل الخروج',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      submit: 'إرسال',
      total_orders: 'إجمالي الطلبات',
      active_couriers: 'السعاة النشطون',
      pending_routes: 'المسارات المعلقة',
      order_id: 'رقم الطلب',
      customer: 'العميل',
      address: 'العنوان',
      status: 'الحالة',
      actions: 'الإجراءات',
      normalize: 'تطبيع',
      plan_route: 'تخطيط المسار',
      courier: 'ساعي',
      orders_count: 'عدد الطلبات',
      distance: 'المسافة',
      duration: 'المدة',
      ask_question: 'اطرح سؤالاً...',
      send: 'إرسال',
      language: 'اللغة',
      pending: 'معلق',
      normalized: 'مطبع',
      assigned: 'معين',
      in_transit: 'قيد التوصيل',
      delivered: 'تم التوصيل'
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;

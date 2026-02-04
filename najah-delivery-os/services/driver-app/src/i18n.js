import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      login: 'Login',
      my_route: 'My Route',
      start_route: 'Start Route',
      complete_delivery: 'Complete Delivery',
      location_update_sent: 'Location update sent',
      email: 'Email',
      password: 'Password',
      logout: 'Logout',
      no_route: 'No route assigned',
      orders_to_deliver: 'Orders to Deliver',
      customer: 'Customer',
      address: 'Address',
      status: 'Status',
      mark_delivered: 'Mark as Delivered',
      delivered: 'Delivered',
      pending: 'Pending',
      in_transit: 'In Transit'
    }
  },
  ar: {
    translation: {
      login: 'تسجيل الدخول',
      my_route: 'مساري',
      start_route: 'بدء المسار',
      complete_delivery: 'إكمال التسليم',
      location_update_sent: 'تم إرسال تحديث الموقع',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      logout: 'تسجيل الخروج',
      no_route: 'لا يوجد مسار معين',
      orders_to_deliver: 'الطلبات للتسليم',
      customer: 'العميل',
      address: 'العنوان',
      status: 'الحالة',
      mark_delivered: 'تحديد كمسلم',
      delivered: 'تم التسليم',
      pending: 'قيد الانتظار',
      in_transit: 'في الطريق'
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

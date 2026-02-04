// STUB: i18n middleware for Arabic/English support
// In production, this would use a proper i18n library like i18next

const translations = {
  en: {
    'errors.notFound': 'Resource not found',
    'errors.unauthorized': 'Unauthorized access',
    'errors.validationError': 'Validation error',
    'errors.internalError': 'Internal server error',
    'payment.created': 'Payment intent created successfully',
    'payment.confirmed': 'Payment confirmed successfully',
    'payment.cancelled': 'Payment cancelled successfully',
    'payment.failed': 'Payment failed'
  },
  ar: {
    'errors.notFound': 'المورد غير موجود',
    'errors.unauthorized': 'وصول غير مصرح',
    'errors.validationError': 'خطأ في التحقق',
    'errors.internalError': 'خطأ داخلي في الخادم',
    'payment.created': 'تم إنشاء نية الدفع بنجاح',
    'payment.confirmed': 'تم تأكيد الدفع بنجاح',
    'payment.cancelled': 'تم إلغاء الدفع بنجاح',
    'payment.failed': 'فشل الدفع'
  }
};

module.exports = (req, res, next) => {
  // Get language from Accept-Language header or default to Arabic
  const acceptLanguage = req.headers['accept-language'] || 'ar';
  const language = acceptLanguage.startsWith('ar') ? 'ar' : 'en';

  // Add translation function to request
  req.language = language;
  req.t = (key, defaultValue = key) => {
    return translations[language][key] || defaultValue;
  };

  next();
};

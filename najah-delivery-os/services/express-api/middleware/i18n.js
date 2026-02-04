const translations = {
  en: {
    'error.unauthorized': 'Unauthorized access',
    'error.forbidden': 'Forbidden',
    'error.notFound': 'Resource not found',
    'error.validation': 'Validation error',
    'error.internal': 'Internal server error',
    'error.invalidToken': 'Invalid or expired token',
    'error.merchantNotFound': 'Merchant not found',
    'error.orderNotFound': 'Order not found',
    'error.courierNotFound': 'Courier not found',
    'success.created': 'Resource created successfully',
    'success.updated': 'Resource updated successfully',
    'success.deleted': 'Resource deleted successfully'
  },
  ar: {
    'error.unauthorized': 'وصول غير مصرح به',
    'error.forbidden': 'محظور',
    'error.notFound': 'المورد غير موجود',
    'error.validation': 'خطأ في التحقق',
    'error.internal': 'خطأ في الخادم الداخلي',
    'error.invalidToken': 'رمز غير صالح أو منتهي الصلاحية',
    'error.merchantNotFound': 'التاجر غير موجود',
    'error.orderNotFound': 'الطلب غير موجود',
    'error.courierNotFound': 'السائق غير موجود',
    'success.created': 'تم إنشاء المورد بنجاح',
    'success.updated': 'تم تحديث المورد بنجاح',
    'success.deleted': 'تم حذف المورد بنجاح'
  }
};

function i18nMiddleware(req, res, next) {
  const acceptLanguage = req.headers['accept-language'] || 'en';
  const lang = acceptLanguage.startsWith('ar') ? 'ar' : 'en';
  
  req.lang = lang;
  req.t = (key, defaultValue = key) => {
    return translations[lang][key] || defaultValue;
  };
  
  next();
}

module.exports = i18nMiddleware;

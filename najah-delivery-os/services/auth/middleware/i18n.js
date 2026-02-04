const translations = {
  en: {
    notFound: 'Resource not found',
    serverError: 'Internal server error',
    tokenMissing: 'Authorization token is missing',
    tokenInvalid: 'Invalid authorization token',
    tokenExpired: 'Authorization token has expired',
    unauthorized: 'Unauthorized access',
    emailRequired: 'Email is required',
    passwordRequired: 'Password is required',
    invalidCredentials: 'Invalid email or password',
    emailExists: 'Email already exists',
    userNotFound: 'User not found',
    sessionNotFound: 'Session not found or expired',
    refreshTokenInvalid: 'Invalid refresh token',
    userCreated: 'User created successfully',
    loginSuccess: 'Login successful',
    logoutSuccess: 'Logout successful',
    tokenRefreshed: 'Token refreshed successfully'
  },
  ar: {
    notFound: 'المورد غير موجود',
    serverError: 'خطأ في الخادم الداخلي',
    tokenMissing: 'رمز التفويض مفقود',
    tokenInvalid: 'رمز التفويض غير صالح',
    tokenExpired: 'انتهت صلاحية رمز التفويض',
    unauthorized: 'وصول غير مصرح به',
    emailRequired: 'البريد الإلكتروني مطلوب',
    passwordRequired: 'كلمة المرور مطلوبة',
    invalidCredentials: 'بريد إلكتروني أو كلمة مرور غير صالحة',
    emailExists: 'البريد الإلكتروني موجود بالفعل',
    userNotFound: 'المستخدم غير موجود',
    sessionNotFound: 'الجلسة غير موجودة أو منتهية الصلاحية',
    refreshTokenInvalid: 'رمز التحديث غير صالح',
    userCreated: 'تم إنشاء المستخدم بنجاح',
    loginSuccess: 'تم تسجيل الدخول بنجاح',
    logoutSuccess: 'تم تسجيل الخروج بنجاح',
    tokenRefreshed: 'تم تحديث الرمز بنجاح'
  }
};

const i18nMiddleware = (req, res, next) => {
  // Get locale from Accept-Language header or default to 'en'
  const acceptLanguage = req.headers['accept-language'] || 'en';
  const locale = acceptLanguage.split(',')[0].split('-')[0].toLowerCase();
  
  // Set locale, default to 'en' if not supported
  req.locale = translations[locale] ? locale : 'en';
  
  // Add translation function to request
  req.t = (key) => {
    return translations[req.locale][key] || translations.en[key] || key;
  };
  
  next();
};

module.exports = i18nMiddleware;

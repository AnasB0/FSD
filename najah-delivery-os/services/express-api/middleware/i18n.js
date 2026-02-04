const supportedLanguages = (process.env.SUPPORTED_LANGUAGES || 'ar,en').split(',');
const defaultLanguage = process.env.DEFAULT_LANGUAGE || 'ar';

const i18n = (req, res, next) => {
  const acceptLanguage = req.headers['accept-language'];
  
  if (acceptLanguage) {
    const preferredLanguage = acceptLanguage.split(',')[0].split('-')[0];
    req.language = supportedLanguages.includes(preferredLanguage) 
      ? preferredLanguage 
      : defaultLanguage;
  } else {
    req.language = defaultLanguage;
  }
  
  res.setHeader('Content-Language', req.language);
  next();
};

module.exports = i18n;

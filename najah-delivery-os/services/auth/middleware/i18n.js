function i18nMiddleware(req, res, next) {
  const acceptLanguage = req.headers['accept-language'] || 'en';
  const lang = acceptLanguage.split(',')[0].split('-')[0].toLowerCase();
  req.language = ['ar', 'en'].includes(lang) ? lang : 'en';
  next();
}

module.exports = i18nMiddleware;

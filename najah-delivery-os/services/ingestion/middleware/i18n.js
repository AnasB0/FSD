/**
 * Internationalization (i18n) Middleware
 * 
 * Handles language detection from Accept-Language header
 * and attaches the preferred language to the request object.
 * 
 * Supported languages: en (English), ar (Arabic)
 */

const logger = require('../config/logger');

// Supported languages
const SUPPORTED_LANGUAGES = ['en', 'ar'];
const DEFAULT_LANGUAGE = 'en';

/**
 * Parse Accept-Language header and extract language code
 * Format: "en-US,en;q=0.9,ar;q=0.8"
 */
const parseAcceptLanguage = (acceptLanguageHeader) => {
  if (!acceptLanguageHeader) {
    return DEFAULT_LANGUAGE;
  }

  try {
    // Split by comma and extract language codes with quality values
    const languages = acceptLanguageHeader
      .split(',')
      .map(lang => {
        const parts = lang.trim().split(';');
        const code = parts[0].split('-')[0].toLowerCase();
        const quality = parts[1] ? parseFloat(parts[1].split('=')[1]) : 1.0;
        return { code, quality };
      })
      .sort((a, b) => b.quality - a.quality); // Sort by quality (preference)

    // Find first supported language
    for (const lang of languages) {
      if (SUPPORTED_LANGUAGES.includes(lang.code)) {
        return lang.code;
      }
    }
  } catch (err) {
    logger.debug('Error parsing Accept-Language header', {
      header: acceptLanguageHeader,
      error: err.message
    });
  }

  return DEFAULT_LANGUAGE;
};

/**
 * Middleware to detect and set language preference
 */
const i18n = (req, res, next) => {
  const acceptLanguage = req.headers['accept-language'];
  const language = parseAcceptLanguage(acceptLanguage);

  // Attach language to request object
  req.language = language;
  req.isRTL = language === 'ar'; // Right-to-left for Arabic

  logger.debug('Language detected', {
    requestId: req.id,
    acceptLanguage,
    detectedLanguage: language,
    isRTL: req.isRTL
  });

  // Set Content-Language response header
  res.setHeader('Content-Language', language);

  next();
};

module.exports = i18n;

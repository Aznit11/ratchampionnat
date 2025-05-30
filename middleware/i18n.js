/**
 * Internationalization middleware for the Football League application
 */

const path = require('path');
const fs = require('fs');

// Load translation files
const loadTranslations = () => {
  const translations = {
    // Default fallback English translations in case files can't be loaded
    en: {
      global: { title: "Rat Ait Bououlli League", copyright: " Khalid Azeroual. All rights reserved © 2025." },
      navigation: { home: "Home", groups: "Groups", fixtures: "Fixtures" }
    }
  };
  
  try {
    const localesPath = path.join(__dirname, '../locales');
    
    // Check if directory exists
    if (!fs.existsSync(localesPath)) {
      console.error(`Locales directory not found: ${localesPath}`);
      return translations;
    }
    
    // Read all language files
    const files = fs.readdirSync(localesPath);
    files.forEach(file => {
      if (file.endsWith('.json')) {
        try {
          const lang = file.split('.')[0];
          const content = fs.readFileSync(path.join(localesPath, file), 'utf8');
          translations[lang] = JSON.parse(content);
        } catch (fileErr) {
          console.error(`Error loading translation file ${file}:`, fileErr);
        }
      }
    });
  } catch (err) {
    console.error('Error loading translations:', err);
  }
  
  return translations;
};

// Translation middleware
const i18nMiddleware = (req, res, next) => {
  // Load all translations
  const translations = loadTranslations();
  
  // Set default language to Arabic
  let lang = 'ar';
  
  // Check if cookies exist and get language from cookies
  if (req.cookies && req.cookies.lang) {
    lang = req.cookies.lang;
  }
  
  // Update language if set in query parameter
  if (req.query && req.query.lang && (req.query.lang === 'en' || req.query.lang === 'ar')) {
    lang = req.query.lang;
    res.cookie('lang', lang, { maxAge: 30 * 24 * 60 * 60 * 1000 }); // 30 days
  }
  
  // Make translations available to templates
  res.locals.t = translations[lang] || translations.en;
  res.locals.currentLanguage = lang;
  res.locals.isRTL = lang === 'ar';
  
  // Add helper methods for language switching
  res.locals.getLanguageUrl = (targetLang) => {
    // Create a new URL with the current path but changed language
    const url = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);
    url.searchParams.set('lang', targetLang);
    return url.pathname + url.search;
  };
  
  // Helper functions for formatting date and time based on language
  res.locals.formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return dateStr;
      }
      const locale = lang === 'ar' ? 'ar-SA' : 'en-US';
      return date.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateStr;
    }
  };
  
  res.locals.formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      // Parse time in 24-hour format
      const [hours, minutes] = timeStr.split(':');
      
      if (!hours || !minutes) {
        return timeStr;
      }
      
      // Convert to 12-hour format
      let hour = parseInt(hours, 10);
      if (isNaN(hour)) {
        return timeStr;
      }
      
      const ampm = hour >= 12 ? (lang === 'ar' ? 'م' : 'PM') : (lang === 'ar' ? 'ص' : 'AM');
      hour = hour % 12;
      hour = hour ? hour : 12; // the hour '0' should be '12'
      
      return `${hour}:${minutes} ${ampm}`;
    } catch (error) {
      return timeStr;
    }
  };
  
  next();
};

module.exports = i18nMiddleware;

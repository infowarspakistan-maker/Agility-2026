import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "nav": {
        "home": "Home",
        "packages": "Packages",
        "visas": "Visa Services",
        "admin": "Intelligence",
        "login": "Sign In",
        "logout": "Sign Out"
      },
      "hero": {
        "title": "AL-MALIK TRAVELS",
        "subtitle": "Your Gateway to Spiritual & Global Discovery",
        "cta": "Explore Packages",
        "description": "Experience the journey of a lifetime with our premium Umrah services and exclusive global travel packages."
      },
      "common": {
        "loading": "Syncing Data...",
        "error": "Transmission Error",
        "success": "Protocol Success"
      }
    }
  },
  ur: {
    translation: {
      "nav": {
        "home": "ہوم",
        "packages": "پیکیجز",
        "visas": "ویزہ سروسز",
        "admin": "انٹیلی جنس",
        "login": "سائن ان",
        "logout": "سائن آؤٹ"
      },
      "hero": {
        "title": "الملک ٹریولز",
        "subtitle": "آپ کا روحانی اور عالمی دریافت کا راستہ",
        "cta": "پیکیجز تلاش کریں",
        "description": "ہماری پریمیم عمرہ سروسز اور خصوصی عالمی سفری پیکیجز کے ساتھ زندگی کا یادگار سفر تجربہ کریں۔"
      },
      "common": {
        "loading": "ڈیٹا ہم آہنگ ہو رہا ہے...",
        "error": "ٹرانسمیشن کی خرابی",
        "success": "پروٹوکول کی کامیابی"
      }
    }
  },
  ar: {
    translation: {
      "nav": {
        "home": "الرئيسية",
        "packages": "الباقات",
        "visas": "خدمات التأشيرات",
        "admin": "الذكاء",
        "login": "تسجيل الدخول",
        "logout": "تسجيل الخروج"
      },
      "hero": {
        "title": "الملك للأسفار",
        "subtitle": "بوابتك للاكتشاف الروحي والعالمي",
        "cta": "استكشف الباقات",
        "description": "اختبر رحلة العمر من خلال خدمات العمرة المتميزة وباقات السفر العالمية الحصرية."
      },
      "common": {
        "loading": "مزامنة البيانات...",
        "error": "خطأ في الإرسال",
        "success": "نجاح البروتوكول"
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'cookie', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage'],
    }
  });

// Handle RTL
i18n.on('languageChanged', (lng) => {
  const dir = lng === 'ur' || lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
});

// Initialize direction
const initialDir = i18n.language === 'ur' || i18n.language === 'ar' ? 'rtl' : 'ltr';
document.documentElement.dir = initialDir;
document.documentElement.lang = i18n.language;

export default i18n;

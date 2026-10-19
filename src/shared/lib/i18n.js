import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import vi from '@/shared/locales/vi.json';
import en from '@/shared/locales/en.json';

const savedLang = localStorage.getItem('sorak-lang') || 'vi';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      vi: { translation: vi },
      en: { translation: en },
    },
    lng: savedLang,
    fallbackLng: 'vi',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('sorak-lang', lng);
  document.documentElement.lang = lng;
});

// Set initial html lang attribute
document.documentElement.lang = savedLang;

export default i18n;

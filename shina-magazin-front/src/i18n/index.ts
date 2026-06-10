import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import uz from './locales/uz.json';
import ru from './locales/ru.json';

// Til-kalit migratsiyasi: eski 'portal-language' -> yagona 'app-language'.
// (Faza 1'da yagona tema/til store'iga ko'chiriladi.) Read-old/write-new shim
// foydalanuvchi tanlovini reset bo'lishidan saqlaydi.
const savedLanguage =
  localStorage.getItem('app-language') ||
  localStorage.getItem('portal-language') ||
  'uz';
localStorage.setItem('app-language', savedLanguage);

i18n.use(initReactI18next).init({
  resources: {
    uz: { translation: uz },
    ru: { translation: ru },
  },
  lng: savedLanguage,
  fallbackLng: 'uz',
  interpolation: {
    escapeValue: false,
  },
});

// Til o'zgarganda yangi kalitni doimo yangilab boramiz.
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('app-language', lng);
});

export default i18n;

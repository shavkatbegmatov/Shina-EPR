import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import uz from './locales/uz.json';

export const SUPPORTED_LANGUAGES = ['uz', 'ru'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Faqat 'uz' (default) statik yuklanadi. Boshqa tillar kerak bo'lganda yuklanadi:
 * ilgari ikkala JSON (230 KB) entry chunk'ida birga ketar va har bir tashrifchi
 * ishlatmaydigan tilni ham yuklab olardi.
 *
 * Test muhitida `src/test/setup.ts` 'ru' ni statik qo'shib qo'yadi — testlar
 * tilni sinxron almashtira oladi.
 */
const lazyBundles: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  ru: () => import('./locales/ru.json'),
};

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

/** Til bundle'i yuklanganini kafolatlaydi (yuklangan bo'lsa darhol qaytadi). */
export async function ensureLanguage(lng: string): Promise<void> {
  if (i18n.hasResourceBundle(lng, 'translation')) return;
  const loader = lazyBundles[lng];
  if (!loader) return;
  const bundle = await loader();
  i18n.addResourceBundle(lng, 'translation', bundle.default, true, true);
}

/**
 * Tilni almashtirish: avval bundle yuklanadi, keyin `changeLanguage`.
 * Komponentlar `i18n.changeLanguage` o'rniga shuni chaqiradi — aks holda
 * hali yuklanmagan til uchun kalitlarning o'zi ko'rinib qolardi.
 */
export async function switchLanguage(lng: string): Promise<void> {
  await ensureLanguage(lng);
  await i18n.changeLanguage(lng);
}

/** Saqlangan til birinchi render'dan OLDIN tayyor bo'lsin (main.tsx kutadi). */
export const initialLanguageReady: Promise<void> = ensureLanguage(savedLanguage).catch(() => undefined);

export default i18n;

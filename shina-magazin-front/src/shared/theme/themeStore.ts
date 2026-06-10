import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Yagona tema manbai — ERP, portal va kelajakdagi storefront uchun bitta store.
// Ilgari ERP (uiStore, 'ui-storage') va portal (portalAuthStore, 'portal-auth-storage')
// alohida tema saqlardi va sinxron emasdi. Endi bitta 'app-theme' kaliti.

export type ThemeMode = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'shina' | 'shina-dark';

export function systemTheme(): EffectiveTheme {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'shina-dark'
    : 'shina';
}

export function resolveTheme(mode: ThemeMode): EffectiveTheme {
  if (mode === 'system') return systemTheme();
  return mode === 'dark' ? 'shina-dark' : 'shina';
}

export function applyTheme(mode: ThemeMode): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', resolveTheme(mode));
  }
}

// Migratsiya shim: 'app-theme' bo'lmasa eski kalitlardan o'qib olamiz, shunda
// foydalanuvchi tanlovi reset bo'lmaydi. ('ui-storage'.themeMode = ERP,
// 'portal-auth-storage'.theme = portal.)
function migratedMode(): ThemeMode | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    if (localStorage.getItem('app-theme')) return null; // persist o'zi hydrate qiladi
    const isMode = (m: unknown): m is ThemeMode =>
      m === 'light' || m === 'dark' || m === 'system';
    const ui = localStorage.getItem('ui-storage');
    if (ui) {
      const m = JSON.parse(ui)?.state?.themeMode;
      if (isMode(m)) return m;
    }
    const pa = localStorage.getItem('portal-auth-storage');
    if (pa) {
      const m = JSON.parse(pa)?.state?.theme;
      if (isMode(m)) return m;
    }
  } catch {
    /* eski kalitlar buzuq bo'lsa — default */
  }
  return null;
}

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  effectiveTheme: () => EffectiveTheme;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: migratedMode() ?? 'system',
      setMode: (mode) => {
        set({ mode });
        applyTheme(mode);
      },
      effectiveTheme: () => resolveTheme(get().mode),
    }),
    {
      name: 'app-theme',
      partialize: (state) => ({ mode: state.mode }),
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.mode);
      },
    }
  )
);

// Migratsiya qiymatini (yoki defaultni) yangi 'app-theme' kalitiga DARHOL yozib
// qo'yamiz. Aks holda eski 'ui-storage' boshqa sabab bilan qayta yozilsa (mas.
// sidebar toggle, endi themeMode'siz), keyingi yuklanishda tanlov yo'qolardi.
if (typeof localStorage !== 'undefined' && !localStorage.getItem('app-theme')) {
  useThemeStore.setState({ mode: useThemeStore.getState().mode });
}

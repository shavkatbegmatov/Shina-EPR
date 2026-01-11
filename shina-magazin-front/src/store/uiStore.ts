import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface UIState {
  sidebarOpen: boolean;
  themeMode: ThemeMode;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
  getEffectiveTheme: () => 'shina' | 'shina-dark';
}

const getSystemTheme = (): 'shina' | 'shina-dark' => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'shina-dark' : 'shina';
  }
  return 'shina';
};

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      themeMode: 'system',

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      setThemeMode: (mode) => {
        set({ themeMode: mode });
        const effectiveTheme = mode === 'system'
          ? getSystemTheme()
          : mode === 'dark' ? 'shina-dark' : 'shina';
        document.documentElement.setAttribute('data-theme', effectiveTheme);
      },

      getEffectiveTheme: () => {
        const { themeMode } = get();
        if (themeMode === 'system') {
          return getSystemTheme();
        }
        return themeMode === 'dark' ? 'shina-dark' : 'shina';
      },
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        themeMode: state.themeMode,
      }),
    }
  )
);

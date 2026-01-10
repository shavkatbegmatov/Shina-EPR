import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CustomerProfile } from '../types/portal.types';

interface PortalAuthState {
  customer: CustomerProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  language: string;
  setAuth: (customer: CustomerProfile, accessToken: string, refreshToken: string) => void;
  setLanguage: (lang: string) => void;
  updateCustomer: (customer: Partial<CustomerProfile>) => void;
  logout: () => void;
}

export const usePortalAuthStore = create<PortalAuthState>()(
  persist(
    (set, get) => ({
      customer: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      language: 'uz',

      setAuth: (customer, accessToken, refreshToken) => {
        localStorage.setItem('portalAccessToken', accessToken);
        localStorage.setItem('portalRefreshToken', refreshToken);
        localStorage.setItem('portal-language', customer.preferredLanguage || 'uz');
        set({
          customer,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          language: customer.preferredLanguage || 'uz',
        });
      },

      setLanguage: (lang) => {
        localStorage.setItem('portal-language', lang);
        set({ language: lang });
        const { customer } = get();
        if (customer) {
          set({ customer: { ...customer, preferredLanguage: lang } });
        }
      },

      updateCustomer: (updates) => {
        const { customer } = get();
        if (customer) {
          set({ customer: { ...customer, ...updates } });
        }
      },

      logout: () => {
        localStorage.removeItem('portalAccessToken');
        localStorage.removeItem('portalRefreshToken');
        set({
          customer: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'portal-auth-storage',
      partialize: (state) => ({
        customer: state.customer,
        isAuthenticated: state.isAuthenticated,
        language: state.language,
      }),
    }
  )
);

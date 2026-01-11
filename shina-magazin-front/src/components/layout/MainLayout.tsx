import { useEffect, useCallback } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';

function useTheme() {
  const { themeMode, getEffectiveTheme } = useUIStore();

  const applyTheme = useCallback(() => {
    document.documentElement.setAttribute('data-theme', getEffectiveTheme());
  }, [getEffectiveTheme]);

  useEffect(() => {
    applyTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (themeMode === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode, applyTheme]);
}

export function MainLayout() {
  const { isAuthenticated } = useAuthStore();

  // Apply theme
  useTheme();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen text-base-content">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-auto px-4 pb-6 pt-6 lg:px-8">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}

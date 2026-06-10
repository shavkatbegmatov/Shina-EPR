import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { router } from './router';
import { useThemeStore, applyTheme } from './shared/theme/themeStore';

// Global tema hook — yuklanishda va tizim temasi o'zgarganda data-theme ni qo'llaydi.
function useTheme() {
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    applyTheme(mode);

    // Tizim (system) temasi o'zgarishini kuzatish
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (mode === 'system') {
        applyTheme(mode);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode]);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  // Apply theme globally
  useTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          className: 'bg-base-100 text-base-content border border-base-300',
          style: {
            borderRadius: '14px',
            padding: '12px 14px',
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;

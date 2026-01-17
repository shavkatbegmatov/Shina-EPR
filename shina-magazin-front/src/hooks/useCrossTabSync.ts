import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

/**
 * Cross-tab session synchronization hook
 *
 * Detects when user logs out or session expires in another tab
 * and synchronizes the logout across all tabs.
 *
 * Uses browser's storage event API to listen for localStorage changes.
 */
export function useCrossTabSync() {
  const { logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const handleStorageChange = (event: StorageEvent) => {
      // Only handle storage events from other tabs (event.storageArea is not null)
      if (!event.storageArea) {
        return;
      }

      // Case 1: Access token removed (logout in another tab)
      if (event.key === 'accessToken' && event.oldValue && !event.newValue) {
        console.log('[Cross-Tab Sync] Token removed in another tab - logging out');

        toast.error('Siz boshqa tabda chiqib ketdingiz', {
          duration: 3000,
          icon: '🔒',
        });

        // Small delay to show toast before redirect
        setTimeout(() => {
          logout();
          navigate('/login', { replace: true });
        }, 500);
      }

      // Case 2: User data removed (session cleared)
      if (event.key === 'user' && event.oldValue && !event.newValue) {
        console.log('[Cross-Tab Sync] User data removed in another tab - logging out');

        setTimeout(() => {
          logout();
          navigate('/login', { replace: true });
        }, 500);
      }

      // Case 3: Entire localStorage cleared
      if (event.key === null && event.oldValue === null && event.newValue === null) {
        console.log('[Cross-Tab Sync] localStorage cleared - logging out');

        toast.error('Session tozalandi', {
          duration: 2000,
        });

        setTimeout(() => {
          logout();
          navigate('/login', { replace: true });
        }, 500);
      }

      // Case 4: New login in another tab (token changed)
      if (event.key === 'accessToken' && event.oldValue && event.newValue &&
          event.oldValue !== event.newValue) {
        console.log('[Cross-Tab Sync] New login detected in another tab');

        toast('Boshqa tabda yangi session boshlandi', {
          duration: 3000,
          icon: '🔄',
        });

        // Optionally reload to sync new session data
        // window.location.reload();
      }
    };

    // Listen for storage events (only fires for changes from OTHER tabs/windows)
    window.addEventListener('storage', handleStorageChange);

    console.log('[Cross-Tab Sync] Initialized - listening for cross-tab changes');

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      console.log('[Cross-Tab Sync] Cleanup - stopped listening');
    };
  }, [isAuthenticated, logout, navigate]);
}

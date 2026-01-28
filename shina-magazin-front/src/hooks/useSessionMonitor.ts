import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { sessionsApi } from '../api/sessions.api';
import { useAuthStore } from '../store/authStore';

interface UseSessionMonitorOptions {
  enabled?: boolean;
  pollingInterval?: number; // in milliseconds
  checkOnFocus?: boolean;
}

/**
 * Professional session monitoring hook with:
 * - Periodic polling validation
 * - Tab visibility detection (checks session on tab focus)
 * - Automatic logout on session revocation
 */
export function useSessionMonitor(options: UseSessionMonitorOptions = {}) {
  const {
    enabled = true,
    pollingInterval = 60000, // Default: 60 seconds
    checkOnFocus = true,
  } = options;

  const { logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const isValidatingRef = useRef(false);
  const lastCheckTimeRef = useRef(Date.now());

  const validateSession = async (source: 'polling' | 'visibility' = 'polling') => {
    // Prevent concurrent validations
    if (isValidatingRef.current || !isAuthenticated) {
      return;
    }

    // Rate limiting: Don't check more than once every 10 seconds
    const now = Date.now();
    if (now - lastCheckTimeRef.current < 10000) {
      return;
    }

    isValidatingRef.current = true;
    lastCheckTimeRef.current = now;

    try {
      const isValid = await sessionsApi.validateCurrentSession();

      if (!isValid) {
        // Session was revoked from another device
        console.warn(`[Session Monitor] Session invalidated (source: ${source})`);

        toast.error('Sessioningiz boshqa qurilmadan tugatilgan. Qayta kiring.', {
          duration: 4000,
          icon: '🔒',
        });

        // Clear auth state and redirect to login
        setTimeout(() => {
          logout();
          navigate('/login', { replace: true });
        }, 1000);
      }
    } catch (error: unknown) {
      // If 401/403, session is invalid - let axios interceptor handle it
      const axiosError = error as { response?: { status?: number } };
      if (axiosError?.response?.status === 401 || axiosError?.response?.status === 403) {
        console.warn(`[Session Monitor] Session validation failed with ${axiosError.response?.status}`);
        // Axios interceptor will handle logout automatically
      } else {
        // Network error or other issue - log but don't logout
        console.error('[Session Monitor] Validation error:', error);
      }
    } finally {
      isValidatingRef.current = false;
    }
  };

  // Periodic polling
  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      return;
    }

    const intervalId = setInterval(() => {
      validateSession('polling');
    }, pollingInterval);

    // Initial check after 5 seconds (give time for app to initialize)
    const timeoutId = setTimeout(() => {
      validateSession('polling');
    }, 5000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [enabled, isAuthenticated, pollingInterval]);

  // Visibility API - check session when tab becomes visible
  useEffect(() => {
    if (!enabled || !checkOnFocus || !isAuthenticated) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Session Monitor] Tab focused, validating session');
        validateSession('visibility');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, checkOnFocus, isAuthenticated]);

  // Focus event as fallback for older browsers
  useEffect(() => {
    if (!enabled || !checkOnFocus || !isAuthenticated) {
      return;
    }

    const handleFocus = () => {
      console.log('[Session Monitor] Window focused, validating session');
      validateSession('visibility');
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, checkOnFocus, isAuthenticated]);
}

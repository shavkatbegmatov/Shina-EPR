import { useEffect, useState, useCallback } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { usePortalAuthStore } from '../../store/portalAuthStore';
import { portalApiClient } from '../../api/portal.api';
import { portalWebSocketService } from '../../services/portalWebSocket';
import BottomNav from './BottomNav';

function useTheme() {
  const { theme } = usePortalAuthStore();

  const getEffectiveTheme = useCallback(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'shina-dark' : 'shina';
    }
    return theme === 'dark' ? 'shina-dark' : 'shina';
  }, [theme]);

  useEffect(() => {
    const applyTheme = () => {
      document.documentElement.setAttribute('data-theme', getEffectiveTheme());
    };

    applyTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, getEffectiveTheme]);

  return getEffectiveTheme();
}

export default function PortalLayout() {
  const { isAuthenticated } = usePortalAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [newNotificationTrigger, setNewNotificationTrigger] = useState(0);

  // Apply theme
  useTheme();

  useEffect(() => {
    if (isAuthenticated) {
      // Fetch unread notifications count
      portalApiClient.getUnreadCount()
        .then(setUnreadCount)
        .catch(() => setUnreadCount(0));

      // WebSocket ulanishini boshlash (localStorage'dan token olish)
      const token = localStorage.getItem('portalAccessToken');
      if (token) {
        portalWebSocketService.connect(
          token,
          // Yangi notification kelganda
          () => {
            // Unread count'ni oshirish
            setUnreadCount((prev) => prev + 1);
            // NotificationsPage'ga signal yuborish
            setNewNotificationTrigger((prev) => prev + 1);
          }
        );
      }

      return () => {
        portalWebSocketService.disconnect();
      };
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/kabinet/kirish" replace />;
  }

  return (
    <div className="min-h-screen bg-base-200 flex flex-col max-w-md mx-auto">
      <main className="flex-1 pb-16 overflow-y-auto">
        <Outlet context={{ setUnreadCount, newNotificationTrigger }} />
      </main>
      <BottomNav unreadCount={unreadCount} />
    </div>
  );
}

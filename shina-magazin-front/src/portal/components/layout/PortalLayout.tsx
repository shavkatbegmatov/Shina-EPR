import { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { usePortalAuthStore } from '../../store/portalAuthStore';
import { portalApiClient } from '../../api/portal.api';
import { portalWebSocketService } from '../../services/portalWebSocket';
import BottomNav from './BottomNav';

// Tema globalda App.tsx useTheme() orqali qo'llanadi (yagona themeStore).
export default function PortalLayout() {
  const { isAuthenticated } = usePortalAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [newNotificationTrigger, setNewNotificationTrigger] = useState(0);

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
    return <Navigate to="/hisob/kirish" replace />;
  }

  return (
    <div className="min-h-screen bg-base-200 flex flex-col w-full max-w-md md:max-w-3xl lg:max-w-5xl mx-auto">
      <main className="flex-1 pb-16 overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
        <Outlet context={{ setUnreadCount, newNotificationTrigger }} />
      </main>
      <BottomNav unreadCount={unreadCount} />
    </div>
  );
}

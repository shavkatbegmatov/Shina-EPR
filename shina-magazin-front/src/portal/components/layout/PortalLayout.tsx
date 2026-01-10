import { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { usePortalAuthStore } from '../../store/portalAuthStore';
import { portalApiClient } from '../../api/portal.api';
import BottomNav from './BottomNav';

export default function PortalLayout() {
  const { isAuthenticated } = usePortalAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      // Fetch unread notifications count
      portalApiClient.getUnreadCount()
        .then(setUnreadCount)
        .catch(() => setUnreadCount(0));

      // Poll for new notifications every 30 seconds
      const interval = setInterval(() => {
        portalApiClient.getUnreadCount()
          .then(setUnreadCount)
          .catch(() => {});
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/kabinet/kirish" replace />;
  }

  return (
    <div className="min-h-screen bg-base-200 flex flex-col max-w-md mx-auto">
      <main className="flex-1 pb-16 overflow-y-auto">
        <Outlet context={{ setUnreadCount }} />
      </main>
      <BottomNav unreadCount={unreadCount} />
    </div>
  );
}

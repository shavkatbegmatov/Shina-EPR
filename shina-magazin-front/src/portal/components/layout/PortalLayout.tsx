import { useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePortalAuthStore } from '../../store/portalAuthStore';
import { portalApiClient } from '../../api/portal.api';
import { portalKeys, PORTAL_STALE_TIME } from '../../api/portalQueryKeys';
import { portalWebSocketService } from '../../services/portalWebSocket';
import BottomNav from './BottomNav';
import { ErrorBoundary } from '../../../components/common/ErrorBoundary';

// Tema globalda App.tsx useTheme() orqali qo'llanadi (yagona themeStore).
export default function PortalLayout() {
  const { isAuthenticated } = usePortalAuthStore();
  const location = useLocation();
  const queryClient = useQueryClient();

  // O'qilmagan bildirishnomalar soni — pastki navigatsiya belgisi
  const { data: unreadCount = 0 } = useQuery({
    queryKey: portalKeys.unreadCount(),
    queryFn: () => portalApiClient.getUnreadCount(),
    enabled: isAuthenticated,
    staleTime: PORTAL_STALE_TIME,
    retry: false,
  });

  useEffect(() => {
    if (!isAuthenticated) return;

    // WebSocket ulanishini boshlash (localStorage'dan token olish)
    const token = localStorage.getItem('portalAccessToken');
    if (token) {
      portalWebSocketService.connect(token, () => {
        // Yangi bildirishnoma: barcha kabinet so'rovlari eskiradi — hisoblagich,
        // ro'yxatlar va dashboard fonda qayta olinadi. Ilgari har sahifa o'z
        // "trigger" hisoblagichini kuzatib, loader'ini qo'lda chaqirardi.
        void queryClient.invalidateQueries({ queryKey: portalKeys.all });
      });
    }

    return () => {
      portalWebSocketService.disconnect();
    };
  }, [isAuthenticated, queryClient]);

  if (!isAuthenticated) {
    return <Navigate to={`/kirish?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return (
    <div className="min-h-screen bg-base-200 flex flex-col w-full max-w-md md:max-w-3xl lg:max-w-5xl mx-auto">
      <main className="flex-1 pb-16 overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
        {/* Sahifa yiqilsa pastki navigatsiya qoladi — mijoz boshqa bo'limga o'ta oladi. */}
        <ErrorBoundary resetKeys={[location.pathname]}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <BottomNav unreadCount={unreadCount} />
    </div>
  );
}

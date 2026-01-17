import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useSessionMonitor } from '../../hooks/useSessionMonitor';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { PasswordChangeModal } from '../common/PasswordChangeModal';

export function MainLayout() {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Professional session monitoring:
  // - Checks session every 60 seconds
  // - Validates session when tab becomes visible
  // - Auto-logout if session revoked from another device
  useSessionMonitor({
    enabled: true,
    pollingInterval: 60000, // 60 seconds
    checkOnFocus: true,
  });

  // Show password change modal if user must change password
  useEffect(() => {
    if (user?.mustChangePassword) {
      setShowPasswordModal(true);
    }
  }, [user?.mustChangePassword]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="flex h-screen overflow-hidden text-base-content">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-6 pt-6 lg:px-8" style={{ scrollbarGutter: 'stable' }}>
          <Outlet />
        </main>
        <Footer />
      </div>

      {/* Password Change Modal - shows if user mustChangePassword */}
      <PasswordChangeModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
}

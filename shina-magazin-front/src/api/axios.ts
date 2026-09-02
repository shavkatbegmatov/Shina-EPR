import toast from 'react-hot-toast';
import i18n from '../i18n';
import { useAuthStore } from '../store/authStore';
import { createAuthClient } from './createAuthClient';

const LOGIN_PATH = '/admin/login';

const redirectToLogin = (delayMs: number) => {
  if (window.location.pathname.includes(LOGIN_PATH)) return;
  if (delayMs > 0) {
    setTimeout(() => {
      window.location.href = LOGIN_PATH;
    }, delayMs);
  } else {
    window.location.href = LOGIN_PATH;
  }
};

/** ERP (xodim) API klienti. Single-flight refresh mantig'i — createAuthClient. */
const api = createAuthClient({
  accessTokenKey: 'accessToken',
  refreshTokenKey: 'refreshToken',
  refreshPath: '/v1/auth/refresh-token',
  onSessionLost: (reason) => {
    // MUHIM: logout() zustand auth holatini ham tozalaydi (isAuthenticated=false) —
    // shusiz LoginPage isAuthenticated:true ni ko'rib Dashboard'ga qaytaradi va 401 loop boshlanadi.
    useAuthStore.getState().logout();

    if (reason === 'refresh-failed') {
      // Sessiya bekor qilingan — foydalanuvchi xabarni ko'rsin, keyin login
      if (!window.location.pathname.includes(LOGIN_PATH)) {
        toast.error(i18n.t('common.sessionExpired'));
      }
      redirectToLogin(1000);
    } else {
      redirectToLogin(0);
    }
  },
  onForbidden: (message, url) => {
    toast.error(message, { duration: 4000, icon: '🔒' });
    console.warn('Permission denied:', url, message);
  },
});

export default api;

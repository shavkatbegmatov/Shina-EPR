import { createAuthClient } from '../../api/createAuthClient';
import { usePortalAuthStore } from '../store/portalAuthStore';

/**
 * Mijoz kabineti (/hisob) API klienti.
 *
 * Refresh muvaffaqiyatsiz bo'lsa sessiya tozalanib, foydalanuvchi /kirish ga
 * yo'naltiriladi (joriy sahifa `redirect` sifatida saqlanadi). Single-flight
 * refresh — createAuthClient; do'kon akkaunti klienti bilan bitta refresh'ni bo'lishadi.
 */
const portalApi = createAuthClient({
  accessTokenKey: 'portalAccessToken',
  refreshTokenKey: 'portalRefreshToken',
  refreshPath: '/v1/customer-auth/refresh-token',
  onSessionLost: () => {
    usePortalAuthStore.getState().logout();
    if (!window.location.pathname.startsWith('/kirish')) {
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/kirish?redirect=${redirect}`;
    }
  },
});

export default portalApi;

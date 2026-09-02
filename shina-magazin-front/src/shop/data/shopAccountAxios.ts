import { createAuthClient } from '../../api/createAuthClient';
import { usePortalAuthStore } from '../../portal/store/portalAuthStore';

/**
 * Storefront mijoz akkaunti uchun axios klienti. Portal customer sessiyasini
 * QAYTA ISHLATADI (bitta mijoz akkaunti — portal + do'kon bir xil telefon+PIN).
 *
 * portalAxios'dan FARQI: 401 refresh muvaffaqiyatsiz bo'lsa **soft logout**
 * (redirect YO'Q) — do'kon ommaviy bo'lib qoladi (OrdersPage guest ko'rinishga
 * tushadi), mijoz ERP/portal login'iga uloqtirilmaydi.
 */
const shopAccountApi = createAuthClient({
  accessTokenKey: 'portalAccessToken',
  refreshTokenKey: 'portalRefreshToken',
  refreshPath: '/v1/customer-auth/refresh-token',
  onSessionLost: () => {
    usePortalAuthStore.getState().logout(); // soft — redirect YO'Q
  },
});

export default shopAccountApi;

import axios from 'axios';
import { API_BASE_URL } from '../../config/constants';
import { usePortalAuthStore } from '../../portal/store/portalAuthStore';

/**
 * Storefront mijoz akkaunti uchun axios klienti. Portal customer sessiyasini
 * QAYTA ISHLATADI (bitta mijoz akkaunti — portal + do'kon bir xil telefon+PIN).
 *
 * portalAxios'dan FARQI: 401 refresh muvaffaqiyatsiz bo'lsa **soft logout**
 * (redirect YO'Q) — do'kon ommaviy bo'lib qoladi (OrdersPage guest ko'rinishga
 * tushadi), mijoz ERP/portal login'iga uloqtirilmaydi.
 */
const shopAccountApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

shopAccountApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('portalAccessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

shopAccountApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('portalRefreshToken');
      if (refreshToken) {
        try {
          const res = await axios.post(
            `${API_BASE_URL}/v1/customer-auth/refresh-token`,
            null,
            { params: { refreshToken } }
          );
          const { accessToken, refreshToken: newRefreshToken } = res.data.data;
          localStorage.setItem('portalAccessToken', accessToken);
          localStorage.setItem('portalRefreshToken', newRefreshToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return shopAccountApi(originalRequest);
        } catch {
          usePortalAuthStore.getState().logout(); // soft — redirect YO'Q
        }
      } else {
        usePortalAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

export default shopAccountApi;

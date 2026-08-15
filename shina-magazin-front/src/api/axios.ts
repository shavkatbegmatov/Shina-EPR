import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config/constants';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Bir vaqtda ketgan bir nechta 401 uchun YAGONA refresh (single-flight).
 *
 * Server refresh tokenni har chaqiruvda ROTATSIYA qiladi va rotatsiyadan
 * chiqqan eskisi qayta kelsa butun sessiyani o'ldiradi — bu o'g'irlangan
 * token himoyasi. Dedup bo'lmasa sahifadagi 2-3 parallel so'rov (dashboard
 * statistikasi + grafik + sidebar hisoblagichi) aynan shu himoyani o'ziga
 * qarshi ishlatardi: birinchi refresh tokenni aylantirar, ikkinchisi eski
 * token bilan kelib sessiyani yopardi va foydalanuvchi HAR token muddati
 * tugashida tizimdan chiqib qolardi.
 *
 * Eslatma: tokenlar localStorage'da, ya'ni bu qulf bitta tab doirasida.
 * Ko'p tabli poyga tor oyna sifatida qoladi (AUDIT.md Q1).
 */
let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = (refreshToken: string): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/v1/auth/refresh-token`, null, { params: { refreshToken } })
      .then((response) => {
        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        return accessToken as string;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken && !originalRequest.url?.includes('/auth/refresh-token')) {
        try {
          // Parallel 401'lar bitta refresh natijasini kutadi
          const accessToken = await refreshAccessToken(refreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, session was likely revoked.
          // MUHIM: logout() zustand auth holatini ham tozalaydi (isAuthenticated=false) —
          // shusiz LoginPage isAuthenticated:true ni ko'rib Dashboard'ga qaytaradi va 401 loop boshlanadi.
          useAuthStore.getState().logout();

          // Only redirect if not already on login page
          if (!window.location.pathname.includes('/admin/login')) {
            toast.error('Sessioningiz tugadi. Qayta kiring.');
            setTimeout(() => {
              window.location.href = '/admin/login';
            }, 1000);
          }
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token or already retrying — clear auth (zustand + tokens) and redirect.
        useAuthStore.getState().logout();

        if (!window.location.pathname.includes('/admin/login')) {
          window.location.href = '/admin/login';
        }
        return Promise.reject(error);
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      const message = error.response?.data?.message || "Sizda bu amalni bajarish uchun ruxsat yo'q";

      // Show toast notification (user-friendly)
      toast.error(message, {
        duration: 4000,
        icon: '🔒',
      });

      // Log to console for debugging (but user already got toast)
      console.warn('Permission denied:', error.config?.url, message);
    }

    return Promise.reject(error);
  }
);

export default api;

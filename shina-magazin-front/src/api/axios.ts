import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config/constants';

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
          const response = await axios.post(
            `${API_BASE_URL}/v1/auth/refresh-token`,
            null,
            { params: { refreshToken } }
          );

          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, session was likely revoked - clear storage and redirect
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');

          // Only redirect if not already on login page
          if (!window.location.pathname.includes('/login')) {
            toast.error('Sessioningiz tugadi. Qayta kiring.');
            setTimeout(() => {
              window.location.href = '/login';
            }, 1000);
          }
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token or already trying to refresh - clear and redirect
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');

        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
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

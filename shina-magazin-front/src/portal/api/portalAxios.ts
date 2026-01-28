import axios from 'axios';
import { API_BASE_URL } from '../../config/constants';

const portalApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
portalApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('portalAccessToken');
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
portalApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('portalRefreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(
            `${API_BASE_URL}/v1/customer-auth/refresh-token`,
            null,
            { params: { refreshToken } }
          );

          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          localStorage.setItem('portalAccessToken', accessToken);
          localStorage.setItem('portalRefreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return portalApi(originalRequest);
        } catch {
          // Refresh failed, logout
          localStorage.removeItem('portalAccessToken');
          localStorage.removeItem('portalRefreshToken');
          window.location.href = '/kabinet/kirish';
        }
      } else {
        window.location.href = '/kabinet/kirish';
      }
    }

    return Promise.reject(error);
  }
);

export default portalApi;

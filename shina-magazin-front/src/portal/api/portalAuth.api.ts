import axios from 'axios';
import { API_BASE_URL } from '../../config/constants';
import type { ApiResponse, CustomerAuthResponse, CustomerLoginRequest } from '../types/portal.types';

export const portalAuthApi = {
  login: async (data: CustomerLoginRequest): Promise<CustomerAuthResponse> => {
    const response = await axios.post<ApiResponse<CustomerAuthResponse>>(
      `${API_BASE_URL}/v1/customer-auth/login`,
      data
    );
    return response.data.data;
  },

  refreshToken: async (refreshToken: string): Promise<CustomerAuthResponse> => {
    const response = await axios.post<ApiResponse<CustomerAuthResponse>>(
      `${API_BASE_URL}/v1/customer-auth/refresh-token`,
      null,
      { params: { refreshToken } }
    );
    return response.data.data;
  },

  logout: async (): Promise<void> => {
    const token = localStorage.getItem('portalAccessToken');
    if (token) {
      try {
        await axios.post(
          `${API_BASE_URL}/v1/customer-auth/logout`,
          null,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch {
        // Ignore errors on logout
      }
    }
  },
};

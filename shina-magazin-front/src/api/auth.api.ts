import api from './axios';
import type { ApiResponse, JwtResponse, LoginRequest, User } from '../types';

export const authApi = {
  login: async (data: LoginRequest): Promise<JwtResponse> => {
    const response = await api.post<ApiResponse<JwtResponse>>('/v1/auth/login', data);
    return response.data.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<ApiResponse<User>>('/v1/auth/me');
    return response.data.data;
  },

  refreshToken: async (refreshToken: string): Promise<JwtResponse> => {
    const response = await api.post<ApiResponse<JwtResponse>>(
      '/v1/auth/refresh-token',
      null,
      { params: { refreshToken } }
    );
    return response.data.data;
  },
};

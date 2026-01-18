import { apiClient } from './axios';

export interface LoginAttempt {
  id: number;
  username: string;
  ipAddress: string;
  deviceType: string;
  browser: string;
  os: string;
  location?: string;
  status: 'SUCCESS' | 'FAILED';
  failureReason?: string;
  createdAt: string;
}

export interface LoginActivityFilters {
  username?: string;
  status?: 'SUCCESS' | 'FAILED';
  ipAddress?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
}

class LoginActivityApi {
  private readonly BASE_URL = '/v1/login-activity';

  async getLoginActivity(filters: LoginActivityFilters = {}) {
    const params = new URLSearchParams();
    if (filters.username) params.append('username', filters.username);
    if (filters.status) params.append('status', filters.status);
    if (filters.ipAddress) params.append('ipAddress', filters.ipAddress);
    if (filters.fromDate) params.append('fromDate', filters.fromDate);
    if (filters.toDate) params.append('toDate', filters.toDate);
    params.append('page', String(filters.page || 0));
    params.append('size', String(filters.size || 20));

    const response = await apiClient.get(`${this.BASE_URL}?${params}`);
    return response.data.data;
  }

  async getMyLoginHistory(page: number = 0, size: number = 20) {
    const response = await apiClient.get(`${this.BASE_URL}/my-history?page=${page}&size=${size}`);
    return response.data.data;
  }
}

export const loginActivityApi = new LoginActivityApi();

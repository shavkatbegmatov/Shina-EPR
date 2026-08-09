import api from './axios';
import type {
  ApiResponse,
  Employee,
  PagedResponse,
  StaffRegistration,
  StaffRegistrationApproveRequest,
  StaffRegistrationStatus,
  StaffRegistrationSubmitRequest,
} from '../types';

/**
 * Xodimlikka ro'yxatdan o'tish so'rovlari.
 *
 * <p>`submit` OMMAVIY — `/admin/register` sahifasidan tokensiz chaqiriladi
 * (backendda permitAll). Qolganlari xodim huquqini talab qiladi.
 */
export const staffRegistrationApi = {
  submit: async (data: StaffRegistrationSubmitRequest): Promise<void> => {
    await api.post('/v1/staff-registration', data);
  },

  getAll: async (
    status?: StaffRegistrationStatus,
    page = 0,
    size = 20
  ): Promise<PagedResponse<StaffRegistration>> => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (status) params.append('status', status);
    const res = await api.get<ApiResponse<PagedResponse<StaffRegistration>>>(
      `/v1/staff-registration?${params}`
    );
    return res.data.data;
  },

  pendingCount: async (): Promise<number> => {
    const res = await api.get<ApiResponse<{ count: number }>>('/v1/staff-registration/pending-count');
    return res.data.data.count;
  },

  /** Javobdagi `newCredentials` — BIR MARTALIK, qayta olib bo'lmaydi. */
  approve: async (id: number, data?: StaffRegistrationApproveRequest): Promise<Employee> => {
    const res = await api.post<ApiResponse<Employee>>(`/v1/staff-registration/${id}/approve`, data ?? {});
    return res.data.data;
  },

  reject: async (id: number, reason?: string): Promise<StaffRegistration> => {
    const params = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    const res = await api.post<ApiResponse<StaffRegistration>>(
      `/v1/staff-registration/${id}/reject${params}`
    );
    return res.data.data;
  },
};

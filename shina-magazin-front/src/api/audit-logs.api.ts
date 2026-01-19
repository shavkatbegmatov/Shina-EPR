import api from './axios';
import type { ApiResponse, PagedResponse } from '../types';

export interface AuditLog {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  userId: number | null;
  username: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export const auditLogsApi = {
  /**
   * Search audit logs with filters and pagination
   */
  searchAuditLogs: async (
    page: number = 0,
    size: number = 20,
    entityType?: string,
    action?: string,
    userId?: number,
    search?: string
  ): Promise<PagedResponse<AuditLog>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      sort: 'createdAt,desc',
    });

    if (entityType) params.append('entityType', entityType);
    if (action) params.append('action', action);
    if (userId) params.append('userId', userId.toString());
    if (search) params.append('search', search);

    const response = await api.get<ApiResponse<PagedResponse<AuditLog>>>(
      `/v1/audit-logs?${params.toString()}`
    );
    return response.data.data;
  },

  /**
   * Get all entity types
   */
  getAllEntityTypes: async (): Promise<string[]> => {
    const response = await api.get<ApiResponse<string[]>>('/v1/audit-logs/entity-types');
    return response.data.data;
  },

  /**
   * Get all actions
   */
  getAllActions: async (): Promise<string[]> => {
    const response = await api.get<ApiResponse<string[]>>('/v1/audit-logs/actions');
    return response.data.data;
  },

  /**
   * Export audit logs to Excel or PDF
   */
  exportAuditLogs: async (
    format: 'excel' | 'pdf',
    filters?: {
      entityType?: string;
      action?: string;
      userId?: number;
      search?: string;
    }
  ): Promise<void> => {
    const params = new URLSearchParams({
      format: format,
    });

    if (filters?.entityType) params.append('entityType', filters.entityType);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.userId) params.append('userId', filters.userId.toString());
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get(
      `/v1/audit-logs/export?${params.toString()}`,
      {
        responseType: 'blob',
      }
    );

    // Download file
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    const extension = format === 'excel' ? 'xlsx' : 'pdf';
    link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.${extension}`;
    link.click();
    window.URL.revokeObjectURL(url);
  },
};

import api from './axios';

export interface Session {
  id: number;
  deviceType: string;
  browser: string;
  os: string;
  ipAddress: string;
  location?: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface RevokeAllResponse {
  revokedCount: number;
}

class SessionsApi {
  private readonly BASE_URL = '/v1/sessions';

  async validateCurrentSession(): Promise<boolean> {
    try {
      const response = await api.get<{ success: boolean; data: { valid: boolean } }>(
        `${this.BASE_URL}/validate`
      );
      return response.data.data.valid;
    } catch (error: unknown) {
      // If 401, session is invalid
      const axiosError = error as { response?: { status?: number } };
      if (axiosError?.response?.status === 401) {
        return false;
      }
      throw error;
    }
  }

  async getActiveSessions(): Promise<Session[]> {
    const response = await api.get<{ success: boolean; data: Session[] }>(
      this.BASE_URL
    );
    return response.data.data;
  }

  async revokeSession(sessionId: number, reason?: string): Promise<void> {
    await api.delete(`${this.BASE_URL}/${sessionId}`, {
      data: { reason },
    });
  }

  async revokeAllOtherSessions(): Promise<RevokeAllResponse> {
    const response = await api.delete<{ success: boolean; data: RevokeAllResponse }>(
      `${this.BASE_URL}/revoke-all`
    );
    return response.data.data;
  }
}

export const sessionsApi = new SessionsApi();

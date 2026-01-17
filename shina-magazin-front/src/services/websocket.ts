import SockJS from 'sockjs-client';
import { Client, IMessage } from '@stomp/stompjs';

// Backend'dan kelayotgan notification response turi
export interface WebSocketNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  referenceType?: string | null;
  referenceId?: number | null;
}

// Permission update message turi
export interface PermissionUpdateMessage {
  permissions: string[];
  roles: string[];
  reason?: string;
  timestamp: number;
}

// Session update message turi
export interface SessionUpdateMessage {
  type: 'SESSION_REVOKED' | 'SESSION_CREATED';
  sessionId: number | null;
  userId: number;
  reason: string;
  timestamp: number;
}

type NotificationCallback = (notification: WebSocketNotification) => void;
type PermissionUpdateCallback = (data: PermissionUpdateMessage) => void;
type SessionUpdateCallback = (data: SessionUpdateMessage) => void;
type ConnectionStatusCallback = (connected: boolean) => void;

class WebSocketService {
  private client: Client | null = null;
  private notificationCallback: NotificationCallback | null = null;
  private permissionUpdateCallback: PermissionUpdateCallback | null = null;
  private sessionUpdateCallback: SessionUpdateCallback | null = null;
  private connectionStatusCallback: ConnectionStatusCallback | null = null;

  /**
   * WebSocket ulanishini boshlash
   */
  connect(
    token: string,
    onNotification: NotificationCallback,
    onPermissionUpdate?: PermissionUpdateCallback,
    onSessionUpdate?: SessionUpdateCallback,
    onConnectionStatus?: ConnectionStatusCallback
  ) {
    this.notificationCallback = onNotification;
    this.permissionUpdateCallback = onPermissionUpdate || null;
    this.sessionUpdateCallback = onSessionUpdate || null;
    this.connectionStatusCallback = onConnectionStatus || null;

    // Agar allaqachon ulanish mavjud bo'lsa, avval uzib tashlaymiz
    if (this.client) {
      // Only deactivate the client, don't clear callbacks yet
      this.client.deactivate();
      this.client = null;
    }

    this.client = new Client({
      // SockJS orqali ulanish (WebSocket fallback bilan)
      webSocketFactory: () => new SockJS('/api/v1/ws'),

      // Auth header
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },

      // Debug (ishlab chiqarish uchun o'chirish mumkin)
      debug: (str) => {
        if (import.meta.env.DEV) {
          console.log('[WebSocket]', str);
        }
      },

      // Ulanish muvaffaqiyatli
      onConnect: () => {
        console.log('[WebSocket] Connected');
        this.connectionStatusCallback?.(true);

        // Barcha staff uchun global bildirishnomalar
        this.client?.subscribe('/topic/staff/notifications', (message: IMessage) => {
          this.handleNotification(message);
        });

        // Foydalanuvchi-specific bildirishnomalar
        this.client?.subscribe('/user/queue/notifications', (message: IMessage) => {
          this.handleNotification(message);
        });

        // Foydalanuvchi huquqlari yangilanishi
        this.client?.subscribe('/user/queue/permissions', (message: IMessage) => {
          this.handlePermissionUpdate(message);
        });

        // Foydalanuvchi sessiyalari yangilanishi
        this.client?.subscribe('/user/queue/sessions', (message: IMessage) => {
          this.handleSessionUpdate(message);
        });
      },

      // Ulanish uzildi
      onDisconnect: () => {
        console.log('[WebSocket] Disconnected');
        this.connectionStatusCallback?.(false);
      },

      // Xatolik
      onStompError: (frame) => {
        console.error('[WebSocket] STOMP error:', frame.headers['message']);
        this.connectionStatusCallback?.(false);
      },

      // Qayta ulanish sozlamalari
      reconnectDelay: 5000,
    });

    this.client.activate();
  }

  /**
   * Bildirishnoma qabul qilish
   */
  private handleNotification(message: IMessage) {
    try {
      const notification = JSON.parse(message.body) as WebSocketNotification;
      this.notificationCallback?.(notification);
    } catch (error) {
      console.error('[WebSocket] Failed to parse notification:', error);
    }
  }

  /**
   * Permission yangilanishini qabul qilish
   */
  private handlePermissionUpdate(message: IMessage) {
    try {
      const data = JSON.parse(message.body) as PermissionUpdateMessage;
      console.log('[WebSocket] Permission update received');

      // Callback chaqirish (authStore ni yangilash uchun)
      if (this.permissionUpdateCallback) {
        this.permissionUpdateCallback(data);
      } else {
        console.warn('[WebSocket] Permission update callback not registered');
      }
    } catch (error) {
      console.error('[WebSocket] Error handling permission update:', error);
    }
  }

  /**
   * Session yangilanishini qabul qilish
   */
  private handleSessionUpdate(message: IMessage) {
    try {
      const data = JSON.parse(message.body) as SessionUpdateMessage;
      console.log('[WebSocket] Session update received:', data.type);

      // Callback chaqirish (SessionsTab ni yangilash uchun)
      if (this.sessionUpdateCallback) {
        this.sessionUpdateCallback(data);
      } else {
        console.warn('[WebSocket] Session update callback not registered');
      }
    } catch (error) {
      console.error('[WebSocket] Error handling session update:', error);
    }
  }

  /**
   * WebSocket ulanishini uzish
   */
  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
    this.notificationCallback = null;
    this.permissionUpdateCallback = null;
    this.sessionUpdateCallback = null;
    this.connectionStatusCallback = null;
  }

  /**
   * Ulanish holatini tekshirish
   */
  isConnected(): boolean {
    return this.client?.connected ?? false;
  }
}

// Singleton instance
export const webSocketService = new WebSocketService();

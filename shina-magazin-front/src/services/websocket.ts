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

type NotificationCallback = (notification: WebSocketNotification) => void;
type PermissionUpdateCallback = (data: PermissionUpdateMessage) => void;
type ConnectionStatusCallback = (connected: boolean) => void;

class WebSocketService {
  private client: Client | null = null;
  private notificationCallback: NotificationCallback | null = null;
  private permissionUpdateCallback: PermissionUpdateCallback | null = null;
  private connectionStatusCallback: ConnectionStatusCallback | null = null;

  /**
   * WebSocket ulanishini boshlash
   */
  connect(
    token: string,
    onNotification: NotificationCallback,
    onPermissionUpdate?: PermissionUpdateCallback,
    onConnectionStatus?: ConnectionStatusCallback
  ) {
    console.log('🔌 webSocketService.connect called');
    console.log('  onNotification callback:', typeof onNotification);
    console.log('  onPermissionUpdate callback:', typeof onPermissionUpdate);
    console.log('  onConnectionStatus callback:', typeof onConnectionStatus);

    this.notificationCallback = onNotification;
    this.permissionUpdateCallback = onPermissionUpdate || null;
    this.connectionStatusCallback = onConnectionStatus || null;

    console.log('  ✅ Callbacks registered:');
    console.log('    - notificationCallback:', this.notificationCallback !== null);
    console.log('    - permissionUpdateCallback:', this.permissionUpdateCallback !== null);
    console.log('    - connectionStatusCallback:', this.connectionStatusCallback !== null);

    // Agar allaqachon ulanish mavjud bo'lsa, avval uzib tashlaymiz
    if (this.client) {
      console.log('  ⚠️ Client already exists, disconnecting old client...');
      // Only deactivate the client, don't clear callbacks yet
      this.client.deactivate();
      this.client = null;
      console.log('  ✅ Old client disconnected');
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
      console.log('[WebSocket] Received notification:', notification.title);
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
      console.log('[WebSocket] Permission update received:', data);
      console.log('[WebSocket] About to call permissionUpdateCallback...');
      console.log('[WebSocket] Callback exists?', this.permissionUpdateCallback !== null);
      console.log('[WebSocket] Callback type:', typeof this.permissionUpdateCallback);

      // Callback chaqirish (authStore ni yangilash uchun)
      if (this.permissionUpdateCallback) {
        console.log('[WebSocket] Calling permissionUpdateCallback NOW...');
        this.permissionUpdateCallback(data);
        console.log('[WebSocket] permissionUpdateCallback completed');
      } else {
        console.warn('[WebSocket] ⚠️ permissionUpdateCallback is NULL - not calling!');
      }

      console.log('[WebSocket] Permissions updated successfully');
    } catch (error) {
      console.error('[WebSocket] Error handling permission update:', error);
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

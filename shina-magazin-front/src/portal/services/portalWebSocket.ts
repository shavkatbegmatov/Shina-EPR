import SockJS from 'sockjs-client';
import { Client, IMessage } from '@stomp/stompjs';

// Backend'dan kelayotgan customer notification response turi
export interface PortalWebSocketNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

type NotificationCallback = (notification: PortalWebSocketNotification) => void;
type ConnectionStatusCallback = (connected: boolean) => void;

class PortalWebSocketService {
  private client: Client | null = null;
  private notificationCallback: NotificationCallback | null = null;
  private connectionStatusCallback: ConnectionStatusCallback | null = null;

  /**
   * WebSocket ulanishini boshlash (Mijoz portali uchun)
   */
  connect(token: string, onNotification: NotificationCallback, onConnectionStatus?: ConnectionStatusCallback) {
    this.notificationCallback = onNotification;
    this.connectionStatusCallback = onConnectionStatus || null;

    // Agar allaqachon ulanish mavjud bo'lsa, avval uzib tashlaymiz
    if (this.client) {
      this.disconnect();
    }

    this.client = new Client({
      // SockJS orqali ulanish
      webSocketFactory: () => new SockJS('/api/ws'),

      // Auth header
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },

      // Debug (ishlab chiqarish uchun o'chirish mumkin)
      debug: (str) => {
        if (import.meta.env.DEV) {
          console.log('[Portal WebSocket]', str);
        }
      },

      // Ulanish muvaffaqiyatli
      onConnect: () => {
        console.log('[Portal WebSocket] Connected');
        this.connectionStatusCallback?.(true);

        // Mijoz uchun bildirishnomalar (user-specific)
        this.client?.subscribe('/user/queue/notifications', (message: IMessage) => {
          this.handleNotification(message);
        });
      },

      // Ulanish uzildi
      onDisconnect: () => {
        console.log('[Portal WebSocket] Disconnected');
        this.connectionStatusCallback?.(false);
      },

      // Xatolik
      onStompError: (frame) => {
        console.error('[Portal WebSocket] STOMP error:', frame.headers['message']);
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
      const notification = JSON.parse(message.body) as PortalWebSocketNotification;
      console.log('[Portal WebSocket] Received notification:', notification.title);
      this.notificationCallback?.(notification);
    } catch (error) {
      console.error('[Portal WebSocket] Failed to parse notification:', error);
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
export const portalWebSocketService = new PortalWebSocketService();

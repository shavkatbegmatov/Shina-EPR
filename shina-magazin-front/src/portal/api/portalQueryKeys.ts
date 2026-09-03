/**
 * Mijoz kabineti (/hisob) React Query kalitlari.
 *
 * Kabinet ERP `queryKeys` registridan ATAYLAB tashqarida: o'z API'si, o'z
 * trafik profili (bitta mijoz, bir necha sahifa). Barcha kalitlar `['portal', ...]`
 * prefiksida — WebSocket orqali yangi bildirishnoma kelganda PortalLayout shu
 * prefiksni bir marta invalidatsiya qiladi va hamma ro'yxat/hisoblagich qayta olinadi.
 * Ilgari har sahifa `newNotificationTrigger` hisoblagichini kuzatib, o'z loader'ini
 * qo'lda qayta chaqirardi va xato holati umuman ko'rsatilmasdi.
 */
export const portalKeys = {
  all: ['portal'] as const,
  dashboard: () => ['portal', 'dashboard'] as const,
  recentPurchases: () => ['portal', 'purchases', 'recent'] as const,
  purchases: () => ['portal', 'purchases', 'list'] as const,
  purchase: (id: number) => ['portal', 'purchases', 'detail', id] as const,
  shopOrders: () => ['portal', 'shop-orders'] as const,
  debts: () => ['portal', 'debts', 'list'] as const,
  totalDebt: () => ['portal', 'debts', 'total'] as const,
  notifications: () => ['portal', 'notifications', 'list'] as const,
  unreadCount: () => ['portal', 'notifications', 'unread-count'] as const,
  profile: () => ['portal', 'profile'] as const,
};

/** Kabinet ma'lumotlari tranzaksion: 30 s "yangi", keyin fonda yangilanadi. */
export const PORTAL_STALE_TIME = 30 * 1000;

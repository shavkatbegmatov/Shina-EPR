export const API_BASE_URL = '/api';

export const SEASONS = {
  SUMMER: { label: 'Yozgi', value: 'SUMMER' },
  WINTER: { label: 'Qishki', value: 'WINTER' },
  ALL_SEASON: { label: 'Universal', value: 'ALL_SEASON' },
} as const;

export const PAYMENT_METHODS = {
  CASH: { label: 'Naqd', value: 'CASH' },
  CARD: { label: 'Karta', value: 'CARD' },
  TRANSFER: { label: "O'tkazma", value: 'TRANSFER' },
  MIXED: { label: 'Aralash', value: 'MIXED' },
} as const;

export const PAYMENT_STATUSES = {
  PAID: { label: "To'langan", value: 'PAID' },
  PARTIAL: { label: 'Qisman', value: 'PARTIAL' },
  UNPAID: { label: "To'lanmagan", value: 'UNPAID' },
} as const;

export const SALE_STATUSES = {
  COMPLETED: { label: 'Yakunlangan', value: 'COMPLETED' },
  CANCELLED: { label: 'Bekor qilingan', value: 'CANCELLED' },
  REFUNDED: { label: 'Qaytarilgan', value: 'REFUNDED' },
} as const;

export const DEBT_STATUSES = {
  ACTIVE: { label: 'Faol', value: 'ACTIVE' },
  PAID: { label: "To'langan", value: 'PAID' },
  OVERDUE: { label: "Muddati o'tgan", value: 'OVERDUE' },
} as const;

export const MOVEMENT_TYPES = {
  IN: { label: 'Kirim', value: 'IN' },
  OUT: { label: 'Chiqim', value: 'OUT' },
  ADJUSTMENT: { label: 'Tuzatish', value: 'ADJUSTMENT' },
} as const;

export const REFERENCE_TYPES = {
  SALE: { label: 'Sotuv', value: 'SALE' },
  SALE_CANCEL: { label: 'Sotuv bekor', value: 'SALE_CANCEL' },
  PURCHASE: { label: 'Xarid', value: 'PURCHASE' },
  MANUAL: { label: 'Qo\'lda', value: 'MANUAL' },
  RETURN: { label: 'Qaytarish', value: 'RETURN' },
} as const;

export const CUSTOMER_TYPES = {
  INDIVIDUAL: { label: 'Jismoniy shaxs', value: 'INDIVIDUAL' },
  BUSINESS: { label: 'Yuridik shaxs', value: 'BUSINESS' },
} as const;

export const ROLES = {
  ADMIN: { label: 'Administrator', value: 'ADMIN' },
  MANAGER: { label: 'Menejer', value: 'MANAGER' },
  SELLER: { label: 'Sotuvchi', value: 'SELLER' },
} as const;

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('uz-UZ', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + " so'm";
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('uz-UZ').format(num);
};

// Sana formati: dd.mm.yyyy (masalan: 09.02.2026)
export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

// Sana va vaqt formati: dd.mm.yyyy HH:mm (masalan: 09.02.2026 14:30)
export const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
};

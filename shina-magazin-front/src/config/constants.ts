export const API_BASE_URL = '/api';

// ==================== TIMEZONE CONFIGURATION ====================
// Loyiha standarti: Asia/Tashkent (UTC+5)
export const TIMEZONE = 'Asia/Tashkent';

/**
 * Toshkent vaqtida bugungi sanani YYYY-MM-DD formatida qaytaradi
 * Backend API uchun ishlatiladi
 */
export const getTashkentToday = (): string => {
  return new Date().toLocaleDateString('sv-SE', { timeZone: TIMEZONE });
};

/**
 * Toshkent vaqtida hozirgi Date obyektini qaytaradi
 */
export const getTashkentNow = (): Date => {
  const now = new Date();
  const tashkentTime = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
  return tashkentTime;
};

/**
 * Date obyektini API uchun YYYY-MM-DD formatiga o'giradi (Toshkent TZ)
 */
export const formatDateForApi = (date: Date): string => {
  return date.toLocaleDateString('sv-SE', { timeZone: TIMEZONE });
};

/**
 * Bugundan N kun oldingi sanani YYYY-MM-DD formatida qaytaradi
 */
export const getDateDaysAgo = (days: number): string => {
  const date = getTashkentNow();
  date.setDate(date.getDate() - days);
  return formatDateForApi(date);
};

/**
 * Bugundan N oy oldingi sanani YYYY-MM-DD formatida qaytaradi
 */
export const getDateMonthsAgo = (months: number): string => {
  const date = getTashkentNow();
  date.setMonth(date.getMonth() - months);
  return formatDateForApi(date);
};

/**
 * Bugundan N yil oldingi sanani YYYY-MM-DD formatida qaytaradi
 */
export const getDateYearsAgo = (years: number): string => {
  const date = getTashkentNow();
  date.setFullYear(date.getFullYear() - years);
  return formatDateForApi(date);
};

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

export const EMPLOYEE_STATUSES = {
  ACTIVE: { label: 'Faol', value: 'ACTIVE', color: 'badge-success' },
  ON_LEAVE: { label: "Ta'tilda", value: 'ON_LEAVE', color: 'badge-warning' },
  TERMINATED: { label: 'Ishdan chiqqan', value: 'TERMINATED', color: 'badge-error' },
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

// Sana formati: dd.mm.yyyy (masalan: 09.02.2026) - Toshkent TZ
export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Sana va vaqt formati: dd.mm.yyyy HH:mm (masalan: 09.02.2026 14:30) - Toshkent TZ
export const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleString('ru-RU', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

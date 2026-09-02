import i18n from '../i18n';
import { enumLabel } from '../shared/enumLabel';

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

/**
 * Enum label xaritalari — `label` GETTER, joriy tildan (erp.enum.<group>.<code>) o'qiladi.
 *
 * Ilgari bu yerda faqat o'zbekcha matnlar qattiq yozilgan edi: interfeys ruschaga
 * o'tsa ham select variantlari va badge'lar o'zbekcha qolardi. Getter tufayli
 * chaqiruv joylari (`Object.entries(X).map(([key, { label }]) => ...)`) o'zgarmaydi,
 * lekin har render'da joriy til uchun label olinadi.
 */
const enumEntry = <V extends string>(group: string, value: V) => ({
  value,
  get label(): string {
    return enumLabel(group, value);
  },
});

export const SEASONS = {
  SUMMER: enumEntry('season', 'SUMMER'),
  WINTER: enumEntry('season', 'WINTER'),
  ALL_SEASON: enumEntry('season', 'ALL_SEASON'),
} as const;

export const PAYMENT_METHODS = {
  CASH: enumEntry('payment', 'CASH'),
  CARD: enumEntry('payment', 'CARD'),
  TRANSFER: enumEntry('payment', 'TRANSFER'),
  MIXED: enumEntry('payment', 'MIXED'),
} as const;

export const PAYMENT_STATUSES = {
  PAID: enumEntry('paymentStatus', 'PAID'),
  PARTIAL: enumEntry('paymentStatus', 'PARTIAL'),
  UNPAID: enumEntry('paymentStatus', 'UNPAID'),
} as const;

export const SALE_STATUSES = {
  COMPLETED: enumEntry('saleStatus', 'COMPLETED'),
  CANCELLED: enumEntry('saleStatus', 'CANCELLED'),
  REFUNDED: enumEntry('saleStatus', 'REFUNDED'),
} as const;

export const DEBT_STATUSES = {
  ACTIVE: enumEntry('debtStatus', 'ACTIVE'),
  PAID: enumEntry('debtStatus', 'PAID'),
  OVERDUE: enumEntry('debtStatus', 'OVERDUE'),
  CANCELLED: enumEntry('debtStatus', 'CANCELLED'),
} as const;

export const MOVEMENT_TYPES = {
  IN: enumEntry('movement', 'IN'),
  OUT: enumEntry('movement', 'OUT'),
  ADJUSTMENT: enumEntry('movement', 'ADJUSTMENT'),
} as const;

export const REFERENCE_TYPES = {
  SALE: enumEntry('reference', 'SALE'),
  SALE_CANCEL: enumEntry('reference', 'SALE_CANCEL'),
  PURCHASE: enumEntry('reference', 'PURCHASE'),
  MANUAL: enumEntry('reference', 'MANUAL'),
  RETURN: enumEntry('reference', 'RETURN'),
} as const;

export const CUSTOMER_TYPES = {
  INDIVIDUAL: enumEntry('customerType', 'INDIVIDUAL'),
  BUSINESS: enumEntry('customerType', 'BUSINESS'),
} as const;

export const ROLES = {
  ADMIN: enumEntry('role', 'ADMIN'),
  MANAGER: enumEntry('role', 'MANAGER'),
  SELLER: enumEntry('role', 'SELLER'),
} as const;

export const EMPLOYEE_STATUSES = {
  ACTIVE: { ...enumEntry('employeeStatus', 'ACTIVE'), color: 'badge-success' },
  ON_LEAVE: { ...enumEntry('employeeStatus', 'ON_LEAVE'), color: 'badge-warning' },
  TERMINATED: { ...enumEntry('employeeStatus', 'TERMINATED'), color: 'badge-error' },
} as const;

/** Valyuta qo'shimchasi joriy tildan ("so'm" / "сум"); i18n hali tayyor bo'lmasa o'zbekcha. */
const currencySuffix = (): string => {
  const suffix = i18n.t('common.sum', { defaultValue: "so'm" });
  return suffix === 'common.sum' ? "so'm" : suffix;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('uz-UZ', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' ' + currencySuffix();
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

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
  SALE_RETURN: enumEntry('reference', 'SALE_RETURN'),
  PURCHASE: enumEntry('reference', 'PURCHASE'),
  PURCHASE_RETURN: enumEntry('reference', 'PURCHASE_RETURN'),
  TRADE_IN: enumEntry('reference', 'TRADE_IN'),
  TRADE_IN_CANCEL: enumEntry('reference', 'TRADE_IN_CANCEL'),
  MANUAL: enumEntry('reference', 'MANUAL'),
  RETURN: enumEntry('reference', 'RETURN'),
} as const;

/** Kirim hujjati holatlari — badge ranglari bilan. */
export const PURCHASE_STATUSES = {
  DRAFT: { ...enumEntry('purchaseStatus', 'DRAFT'), color: 'badge-ghost' },
  ORDERED: { ...enumEntry('purchaseStatus', 'ORDERED'), color: 'badge-info' },
  PARTIAL: { ...enumEntry('purchaseStatus', 'PARTIAL'), color: 'badge-warning' },
  RECEIVED: { ...enumEntry('purchaseStatus', 'RECEIVED'), color: 'badge-success' },
  CANCELLED: { ...enumEntry('purchaseStatus', 'CANCELLED'), color: 'badge-error' },
} as const;

/** Kirim hujjati valyutalari; pul ustunlari doim so'mda, bu faqat kiritish uchun. */
export const PURCHASE_CURRENCIES = {
  UZS: enumEntry('currency', 'UZS'),
  USD: enumEntry('currency', 'USD'),
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

/**
 * Ming ajratkichi — uzilmaydigan bo'sh joy (U+00A0): "2 760 000".
 *
 * <p>Ilgari `Intl.NumberFormat('uz-UZ')` ishlatilardi, lekin uz-UZ uchun
 * ajratkich brauzerning ICU/CLDR versiyasiga qarab har xil: bir brauzerda
 * "2,760,000", boshqasida "2 760 000" — bitta sahifada summa vergul bilan,
 * kiritish maydoni esa bo'sh joy bilan chiqib qolardi. Endi guruhlash
 * en-US (doim vergul) orqali olinib, vergul shu belgiga almashtiriladi —
 * natija har qanday brauzer, Node (testlar) va printerda bir xil.
 * Kasr ajratkichi nuqta (`46.25`), avvalgi brauzer ko'rinishi bilan bir xil.
 */
export const THOUSANDS_SEPARATOR = '\u00a0';

/** Raqamni ming ajratkichi bilan, qo'shimchasiz: `formatAmount(2760000)` → "2 760 000". */
export const formatAmount = (value: number, maxFractionDigits = 0): string =>
  new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  })
    .format(value)
    .replace(/,/g, THOUSANDS_SEPARATOR);

export const formatCurrency = (amount: number): string => {
  return formatAmount(amount) + ' ' + currencySuffix();
};

export const formatNumber = (num: number): string => {
  return formatAmount(num, 3);
};

/**
 * Hujjat valyutasidagi summa: `$46.25`, `$5 296`. So'm uchun `formatCurrency`.
 * Kasr faqat kerak bo'lganda (46.25 → ko'rinadi, 555 → yo'q).
 */
export const formatForeign = (amount: number, currency: string = 'USD'): string => {
  const formatted = formatAmount(amount, 2);
  return currency === 'USD' ? `$${formatted}` : `${formatted} ${currency}`;
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

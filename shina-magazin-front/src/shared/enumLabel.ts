import i18n from '../i18n';

/**
 * Enum kodini (mas. "CASH", "ADMIN") joriy tildagi labelga aylantiradi.
 * Global i18n instance'dan foydalanadi — React komponentlarida ham, React'siz
 * kontekstda ham (mas. export utils) ishlaydi. Kalit topilmasa, kodning o'zini qaytaradi.
 *
 * Guruhlar: season, payment, paymentStatus, saleStatus, debtStatus, movement,
 * reference, customerType, role, employeeStatus (erp.enum.<group>.<code>).
 */
export function enumLabel(group: string, code?: string | null): string {
  if (!code) return '—';
  const key = `erp.enum.${group}.${code}`;
  const value = i18n.t(key);
  return value === key ? code : value;
}

import type { AuditLogGroup, AuditOperationType, AuditLogGroupDetail, GroupDetailItem } from '../types';
import { format } from 'date-fns';
import { uz } from 'date-fns/locale';

/**
 * Format currency value in Uzbek som
 */
function formatCurrency(value: unknown): string {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return String(value);
  return new Intl.NumberFormat('uz-UZ').format(num) + " so'm";
}

/**
 * Translate payment method to Uzbek
 */
function translatePaymentMethod(method: string): string {
  switch (method) {
    case 'CASH':
      return 'Naqd';
    case 'CARD':
      return 'Karta';
    case 'TRANSFER':
      return "O'tkazma";
    case 'MIXED':
      return 'Aralash';
    default:
      return method;
  }
}

/**
 * Translate debt status to Uzbek
 */
function translateDebtStatus(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'Faol';
    case 'PAID':
      return "To'langan";
    case 'OVERDUE':
      return "Muddati o'tgan";
    default:
      return status;
  }
}

/**
 * Format timestamp for display
 */
function formatTimestamp(dateString: string): string {
  try {
    return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: uz });
  } catch {
    return dateString;
  }
}

/**
 * Get safe value from record
 */
function getVal<T>(obj: Record<string, unknown> | null | undefined, key: string): T | undefined {
  if (!obj) return undefined;
  return obj[key] as T | undefined;
}

/**
 * Determine operation type from audit log group
 */
function determineOperationType(group: AuditLogGroup): AuditOperationType {
  const entityTypes = new Set(group.entityTypes);

  // Qarz to'lash: Payment + Debt (va mumkin Customer, Sale)
  if (entityTypes.has('Payment') && entityTypes.has('Debt')) {
    return 'DEBT_PAYMENT';
  }

  // Sotuv yaratish: Sale + SaleItem (va mumkin Customer, Product, Debt)
  if (entityTypes.has('Sale') && (entityTypes.has('SaleItem') || entityTypes.has('StockMovement'))) {
    return 'SALE_CREATE';
  }

  return 'GENERIC';
}

/**
 * Extract debt payment details from group
 */
function extractDebtPaymentDetail(group: AuditLogGroup): AuditLogGroupDetail {
  const details: GroupDetailItem[] = [];

  // Find relevant logs
  const paymentLog = group.logs.find(l => l.entityType === 'Payment');
  const debtLog = group.logs.find(l => l.entityType === 'Debt');
  const customerLog = group.logs.find(l => l.entityType === 'Customer');
  const saleLog = group.logs.find(l => l.entityType === 'Sale');

  // Mijoz (Customer)
  const customerName = getVal<string>(customerLog?.newValue, 'fullName') ||
    getVal<string>(paymentLog?.newValue, 'customerName');
  const customerId = customerLog?.entityId || getVal<number>(paymentLog?.newValue, 'customerId');

  if (customerName) {
    details.push({
      label: 'Mijoz',
      value: customerName,
      icon: '👤',
      link: customerId ? `/customers/${customerId}` : undefined,
    });
  }

  // Faktura raqami (Invoice Number)
  const invoiceNumber = getVal<string>(saleLog?.newValue, 'invoiceNumber') ||
    getVal<string>(debtLog?.newValue, 'invoiceNumber') ||
    getVal<string>(paymentLog?.newValue, 'invoiceNumber');
  const saleId = saleLog?.entityId || getVal<number>(debtLog?.newValue, 'saleId');

  if (invoiceNumber) {
    details.push({
      label: 'Faktura raqami',
      value: invoiceNumber,
      icon: '📄',
      link: saleId ? `/sales/${saleId}` : undefined,
    });
  }

  // To'lov summasi
  const paymentAmount = getVal<number>(paymentLog?.newValue, 'amount');
  if (paymentAmount !== undefined) {
    details.push({
      label: "To'lov summasi",
      value: formatCurrency(paymentAmount),
      icon: '💰',
    });
  }

  // To'lov usuli
  const paymentMethod = getVal<string>(paymentLog?.newValue, 'method');
  if (paymentMethod) {
    details.push({
      label: "To'lov usuli",
      value: translatePaymentMethod(paymentMethod),
      icon: '💳',
    });
  }

  // Qarz qoldig'i o'zgarishi
  const oldRemainingAmount = getVal<number>(debtLog?.oldValue, 'remainingAmount');
  const newRemainingAmount = getVal<number>(debtLog?.newValue, 'remainingAmount');
  if (oldRemainingAmount !== undefined || newRemainingAmount !== undefined) {
    details.push({
      label: "Qarz qoldig'i",
      value: formatCurrency(newRemainingAmount),
      oldValue: formatCurrency(oldRemainingAmount),
      icon: '📉',
      changeType: 'MODIFIED',
    });
  }

  // Qarz holati o'zgarishi
  const oldDebtStatus = getVal<string>(debtLog?.oldValue, 'status');
  const newDebtStatus = getVal<string>(debtLog?.newValue, 'status');
  if (oldDebtStatus && newDebtStatus && oldDebtStatus !== newDebtStatus) {
    details.push({
      label: 'Qarz holati',
      value: translateDebtStatus(newDebtStatus),
      oldValue: translateDebtStatus(oldDebtStatus),
      icon: '✅',
      changeType: 'MODIFIED',
    });
  }

  // Mijoz balansi o'zgarishi
  const oldBalance = getVal<number>(customerLog?.oldValue, 'balance');
  const newBalance = getVal<number>(customerLog?.newValue, 'balance');
  if (oldBalance !== undefined || newBalance !== undefined) {
    details.push({
      label: 'Mijoz balansi',
      value: formatCurrency(newBalance),
      oldValue: formatCurrency(oldBalance),
      icon: '💼',
      changeType: 'MODIFIED',
    });
  }

  return {
    operationType: 'DEBT_PAYMENT',
    operationLabel: "Qarz to'lash",
    timestamp: formatTimestamp(group.timestamp),
    operatorUsername: group.username || 'Noma\'lum',
    operatorLink: group.logs[0]?.userId ? `/employees?userId=${group.logs[0].userId}` : undefined,
    details,
    logs: group.logs,
  };
}

/**
 * Extract sale creation details from group
 */
function extractSaleCreateDetail(group: AuditLogGroup): AuditLogGroupDetail {
  const details: GroupDetailItem[] = [];

  // Find relevant logs
  const saleLog = group.logs.find(l => l.entityType === 'Sale');
  const customerLog = group.logs.find(l => l.entityType === 'Customer');
  const debtLog = group.logs.find(l => l.entityType === 'Debt');
  const saleItemLogs = group.logs.filter(l => l.entityType === 'SaleItem');

  // Faktura raqami
  const invoiceNumber = getVal<string>(saleLog?.newValue, 'invoiceNumber');
  if (invoiceNumber) {
    details.push({
      label: 'Faktura raqami',
      value: invoiceNumber,
      icon: '📄',
      link: saleLog?.entityId ? `/sales/${saleLog.entityId}` : undefined,
    });
  }

  // Mijoz
  const customerName = getVal<string>(saleLog?.newValue, 'customerName') ||
    getVal<string>(customerLog?.newValue, 'fullName');
  const customerId = getVal<number>(saleLog?.newValue, 'customerId') || customerLog?.entityId;
  if (customerName) {
    details.push({
      label: 'Mijoz',
      value: customerName,
      icon: '👤',
      link: customerId ? `/customers/${customerId}` : undefined,
    });
  }

  // Mahsulotlar soni
  if (saleItemLogs.length > 0) {
    details.push({
      label: 'Mahsulotlar',
      value: `${saleItemLogs.length} ta`,
      icon: '📦',
    });
  }

  // Umumiy summa
  const totalAmount = getVal<number>(saleLog?.newValue, 'totalAmount');
  if (totalAmount !== undefined) {
    details.push({
      label: 'Umumiy summa',
      value: formatCurrency(totalAmount),
      icon: '💰',
    });
  }

  // To'langan summa
  const paidAmount = getVal<number>(saleLog?.newValue, 'paidAmount');
  if (paidAmount !== undefined) {
    details.push({
      label: "To'langan summa",
      value: formatCurrency(paidAmount),
      icon: '💵',
    });
  }

  // Qarz summasi
  const debtAmount = getVal<number>(saleLog?.newValue, 'debtAmount') ||
    getVal<number>(debtLog?.newValue, 'originalAmount');
  if (debtAmount !== undefined && debtAmount > 0) {
    details.push({
      label: 'Qarz summasi',
      value: formatCurrency(debtAmount),
      icon: '📋',
      changeType: 'ADDED',
    });
  }

  // To'lov usuli
  const paymentMethod = getVal<string>(saleLog?.newValue, 'paymentMethod');
  if (paymentMethod) {
    details.push({
      label: "To'lov usuli",
      value: translatePaymentMethod(paymentMethod),
      icon: '💳',
    });
  }

  return {
    operationType: 'SALE_CREATE',
    operationLabel: 'Sotuv yaratish',
    timestamp: formatTimestamp(group.timestamp),
    operatorUsername: group.username || 'Noma\'lum',
    operatorLink: group.logs[0]?.userId ? `/employees?userId=${group.logs[0].userId}` : undefined,
    details,
    logs: group.logs,
  };
}

/**
 * Extract generic details from group
 */
function extractGenericDetail(group: AuditLogGroup): AuditLogGroupDetail {
  const details: GroupDetailItem[] = [];

  // Entity types
  details.push({
    label: 'Obyekt turlari',
    value: group.entityTypes.join(', '),
    icon: '📂',
  });

  // Log count
  details.push({
    label: 'Loglar soni',
    value: `${group.logCount} ta`,
    icon: '📊',
  });

  return {
    operationType: 'GENERIC',
    operationLabel: group.primaryAction,
    timestamp: formatTimestamp(group.timestamp),
    operatorUsername: group.username || 'Noma\'lum',
    operatorLink: group.logs[0]?.userId ? `/employees?userId=${group.logs[0].userId}` : undefined,
    details,
    logs: group.logs,
  };
}

/**
 * Main function to extract group details
 */
export function extractGroupDetail(group: AuditLogGroup): AuditLogGroupDetail {
  const operationType = determineOperationType(group);

  switch (operationType) {
    case 'DEBT_PAYMENT':
      return extractDebtPaymentDetail(group);
    case 'SALE_CREATE':
      return extractSaleCreateDetail(group);
    case 'GENERIC':
    default:
      return extractGenericDetail(group);
  }
}

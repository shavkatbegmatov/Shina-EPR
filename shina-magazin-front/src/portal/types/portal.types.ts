// Portal Auth Types
export interface CustomerProfile {
  id: number;
  fullName: string;
  phone: string;
  balance: number;
  hasDebt: boolean;
  preferredLanguage: string;
}

export interface CustomerLoginRequest {
  phone: string;
  pin: string;
}

export interface CustomerAuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  customer: CustomerProfile;
}

// Portal Profile Types
export interface CustomerPortalProfile {
  id: number;
  fullName: string;
  phone: string;
  phone2?: string;
  address?: string;
  companyName?: string;
  customerType: 'INDIVIDUAL' | 'BUSINESS';
  balance: number;
  hasDebt: boolean;
  preferredLanguage: string;
  lastLoginAt?: string;
  createdAt: string;
}

// Dashboard Types
export interface CustomerDashboardStats {
  balance: number;
  totalDebt: number;
  totalPurchases: number;
  hasDebt: boolean;
}

// Purchase Types
export interface PortalSaleItem {
  id: number;
  productName: string;
  productSku: string;
  sizeString?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

export interface PortalSale {
  id: number;
  invoiceNumber: string;
  saleDate: string;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  totalAmount: number;
  paidAmount: number;
  debtAmount: number;
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'MIXED';
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  status: 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  notes?: string;
  items?: PortalSaleItem[];
}

// Debt Types
export interface PortalDebt {
  id: number;
  saleId?: number;
  invoiceNumber?: string;
  originalAmount: number;
  remainingAmount: number;
  paidAmount: number;
  dueDate?: string;
  status: 'ACTIVE' | 'PAID' | 'OVERDUE';
  overdue: boolean;
  notes?: string;
  createdAt: string;
}

// Notification Types
export type NotificationType = 'DEBT_REMINDER' | 'PAYMENT_RECEIVED' | 'PROMOTION' | 'SYSTEM';

export interface PortalNotification {
  id: number;
  title: string;
  message: string;
  notificationType: NotificationType;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  expiresAt?: string;
  metadata?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  timestamp: string;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
}

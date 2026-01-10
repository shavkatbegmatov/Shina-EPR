// Auth Types
export interface User {
  id: number;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: 'ADMIN' | 'MANAGER' | 'SELLER';
  active: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface JwtResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: User;
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

// Product Types
export type Season = 'SUMMER' | 'WINTER' | 'ALL_SEASON';

export interface Brand {
  id: number;
  name: string;
  country?: string;
  logoUrl?: string;
  active: boolean;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  parentId?: number;
  parentName?: string;
  children?: Category[];
  active: boolean;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  brandName?: string;
  brandId?: number;
  categoryName?: string;
  categoryId?: number;
  width?: number;
  profile?: number;
  diameter?: number;
  sizeString?: string;
  loadIndex?: string;
  speedRating?: string;
  season?: Season;
  purchasePrice?: number;
  sellingPrice: number;
  quantity: number;
  minStockLevel: number;
  lowStock: boolean;
  description?: string;
  imageUrl?: string;
  active: boolean;
}

export interface ProductRequest {
  sku: string;
  name: string;
  brandId?: number;
  categoryId?: number;
  width?: number;
  profile?: number;
  diameter?: number;
  loadIndex?: string;
  speedRating?: string;
  season?: Season;
  purchasePrice?: number;
  sellingPrice: number;
  quantity?: number;
  minStockLevel?: number;
  description?: string;
  imageUrl?: string;
}

// Customer Types
export type CustomerType = 'INDIVIDUAL' | 'BUSINESS';

export interface Customer {
  id: number;
  fullName: string;
  phone: string;
  phone2?: string;
  address?: string;
  companyName?: string;
  customerType: CustomerType;
  balance: number;
  hasDebt: boolean;
  notes?: string;
  active: boolean;
}

export interface CustomerRequest {
  fullName: string;
  phone: string;
  phone2?: string;
  address?: string;
  companyName?: string;
  customerType?: CustomerType;
  notes?: string;
}

// Sale Types
export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'MIXED';
export type PaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID';
export type SaleStatus = 'COMPLETED' | 'CANCELLED' | 'REFUNDED';

export interface SaleItem {
  id?: number;
  productId: number;
  productName?: string;
  productSku?: string;
  sizeString?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

export interface Sale {
  id: number;
  invoiceNumber: string;
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  saleDate: string;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  totalAmount: number;
  paidAmount: number;
  debtAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: SaleStatus;
  notes?: string;
  createdByName?: string;
  items?: SaleItem[];
}

export interface SaleItemRequest {
  productId: number;
  quantity: number;
  discount?: number;
  customPrice?: number;
}

export interface SaleRequest {
  customerId?: number;
  items: SaleItemRequest[];
  discountAmount?: number;
  discountPercent?: number;
  paidAmount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

// Debt Types
export type DebtStatus = 'ACTIVE' | 'PAID' | 'OVERDUE';
export type PaymentType = 'SALE_PAYMENT' | 'DEBT_PAYMENT';

export interface Debt {
  id: number;
  customerId: number;
  customerName: string;
  customerPhone: string;
  saleId?: number;
  invoiceNumber?: string;
  originalAmount: number;
  remainingAmount: number;
  paidAmount: number;
  dueDate?: string;
  status: DebtStatus;
  overdue: boolean;
  notes?: string;
  createdAt: string;
}

export interface DebtPaymentRequest {
  amount: number;
  method: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
}

export interface Payment {
  id: number;
  saleId?: number;
  invoiceNumber?: string;
  customerId?: number;
  customerName?: string;
  amount: number;
  method: PaymentMethod;
  paymentType: PaymentType;
  referenceNumber?: string;
  notes?: string;
  paymentDate: string;
  receivedByName: string;
}

// Dashboard Types
export interface DashboardStats {
  todaySalesCount: number;
  todayRevenue: number;
  totalRevenue: number;
  totalProducts: number;
  totalStock: number;
  lowStockCount: number;
  totalCustomers: number;
  totalDebt: number;
}

// Cart Types (for POS)
export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}

// Warehouse Types
export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

export interface StockMovement {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  movementType: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceType: string;
  referenceId?: number;
  notes?: string;
  createdByName: string;
  createdAt: string;
}

export interface StockAdjustmentRequest {
  productId: number;
  movementType: MovementType;
  quantity: number;
  referenceType?: string;
  notes?: string;
}

export interface WarehouseStats {
  totalProducts: number;
  totalStock: number;
  lowStockCount: number;
  todayIncoming: number;
  todayOutgoing: number;
  todayInMovements: number;
  todayOutMovements: number;
}

// Auth Types
export interface User {
  id: number;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: string; // Changed to string to support custom RBAC roles
  active: boolean;
  mustChangePassword?: boolean;
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
  permissions?: string[];
  roles?: string[];
  requiresPasswordChange?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface CredentialsInfo {
  username: string;
  temporaryPassword: string;
  message: string;
  mustChangePassword: boolean;
}

// Settings Types
export interface AppSettings {
  debtDueDays: number;
}

export interface SettingsUpdateRequest {
  debtDueDays: number;
}

// Permission Types
export interface Permission {
  id: number;
  code: string;
  module: string;
  action: string;
  description?: string;
}

// Simple User Type (for role users list)
export interface SimpleUser {
  id: number;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  active: boolean;
}

// Role Types
export interface Role {
  id: number;
  name: string;
  code: string;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
  permissions?: string[];
  permissionCount?: number;
  userCount?: number;
  users?: SimpleUser[];
  createdAt?: string;
  updatedAt?: string;
}

export interface RoleRequest {
  name: string;
  code: string;
  description?: string;
  permissions?: string[];
}

// Audit Log Types
export interface AuditLog {
  id: number;
  entityType: string;
  entityId?: number;
  action: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  userId?: number;
  username?: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  createdAt: string;
}

// Audit Log Group Types (for grouped view)
export interface AuditLogGroup {
  correlationId: string | null;
  groupKey: string;
  timestamp: string;
  username: string | null;
  primaryAction: string;
  summary: string;
  logCount: number;
  logs: AuditLog[];
  entityTypes: string[];
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

// Chart Data Types
export interface ChartData {
  salesTrend: SalesTrendItem[];
  topProducts: TopProductItem[];
  paymentMethods: PaymentMethodItem[];
  categorySales: CategorySalesItem[];
  weekdaySales: WeekdaySalesItem[];
  hourlySales: HourlySalesItem[];
  thisWeekRevenue: number;
  lastWeekRevenue: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  revenueGrowthPercent: number;
  salesGrowthPercent: number;
}

export interface SalesTrendItem {
  date: string;
  salesCount: number;
  revenue: number;
}

export interface TopProductItem {
  productId: number;
  productName: string;
  productSku: string;
  quantitySold: number;
  revenue: number;
}

export interface PaymentMethodItem {
  method: string;
  methodLabel: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface CategorySalesItem {
  categoryId: number;
  categoryName: string;
  quantitySold: number;
  revenue: number;
  percentage: number;
}

export interface WeekdaySalesItem {
  day: string;
  dayOfWeek: number;
  salesCount: number;
  revenue: number;
}

export interface HourlySalesItem {
  hour: number;
  hourLabel: string;
  salesCount: number;
  revenue: number;
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

// Report Types
export interface SalesReport {
  totalRevenue: number;
  totalProfit: number;
  totalSalesCount: number;
  completedSalesCount: number;
  cancelledSalesCount: number;
  averageSaleAmount: number;
  cashTotal: number;
  cardTotal: number;
  transferTotal: number;
  debtTotal: number;
  dailyData: DailySalesData[];
  topProducts: TopSellingProduct[];
  topCustomers: TopCustomer[];
}

export interface DailySalesData {
  date: string;
  revenue: number;
  salesCount: number;
}

export interface TopSellingProduct {
  productId: number;
  productName: string;
  productSku: string;
  quantitySold: number;
  totalRevenue: number;
}

export interface TopCustomer {
  customerId: number;
  customerName: string;
  customerPhone: string;
  purchaseCount: number;
  totalSpent: number;
}

// Warehouse Report Types
export interface WarehouseReport {
  totalProducts: number;
  totalStock: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalStockValue: number;
  totalPotentialRevenue: number;
  totalIncoming: number;
  totalOutgoing: number;
  inMovementsCount: number;
  outMovementsCount: number;
  stockByCategory: StockByCategory[];
  stockByBrand: StockByBrand[];
  lowStockProducts: LowStockProduct[];
  recentMovements: MovementSummary[];
}

export interface StockByCategory {
  categoryId: number;
  categoryName: string;
  productCount: number;
  totalStock: number;
  stockValue: number;
}

export interface StockByBrand {
  brandId: number;
  brandName: string;
  productCount: number;
  totalStock: number;
  stockValue: number;
}

export interface LowStockProduct {
  productId: number;
  productName: string;
  productSku: string;
  currentStock: number;
  minStockLevel: number;
  sellingPrice: number;
}

export interface MovementSummary {
  date: string;
  inCount: number;
  outCount: number;
  inQuantity: number;
  outQuantity: number;
}

// Debts Report Types
export interface DebtsReport {
  totalActiveDebt: number;
  totalPaidDebt: number;
  totalOverdueDebt: number;
  activeDebtsCount: number;
  paidDebtsCount: number;
  overdueDebtsCount: number;
  totalPaymentsReceived: number;
  paymentsCount: number;
  averageDebtAmount: number;
  topDebtors: CustomerDebtSummary[];
  debtAging: DebtAging[];
  recentPayments: PaymentSummaryItem[];
  overdueDebts: OverdueDebtItem[];
}

export interface CustomerDebtSummary {
  customerId: number;
  customerName: string;
  customerPhone: string;
  totalDebt: number;
  debtsCount: number;
  overdueCount: number;
}

export interface DebtAging {
  period: string;
  count: number;
  amount: number;
}

export interface PaymentSummaryItem {
  date: string;
  count: number;
  amount: number;
}

export interface OverdueDebtItem {
  debtId: number;
  customerId: number;
  customerName: string;
  customerPhone: string;
  remainingAmount: number;
  dueDate: string;
  daysOverdue: number;
}

// Supplier Types
export interface Supplier {
  id: number;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  bankDetails?: string;
  balance: number;
  hasDebt: boolean;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierRequest {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  bankDetails?: string;
  notes?: string;
}

// Purchase Order Types
export type PurchaseStatus = 'DRAFT' | 'RECEIVED' | 'CANCELLED';
export type PurchaseReturnStatus = 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED';

export interface PurchaseOrderItem {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PurchaseOrder {
  id: number;
  orderNumber: string;
  supplierId: number;
  supplierName: string;
  orderDate: string;
  dueDate?: string;
  totalAmount: number;
  paidAmount: number;
  debtAmount: number;
  status: PurchaseStatus;
  paymentStatus: PaymentStatus;
  notes?: string;
  items: PurchaseOrderItem[];
  itemCount: number;
  totalQuantity: number;
  paymentCount: number;
  returnCount: number;
  createdAt: string;
  createdByName: string;
}

export interface PurchaseItemRequest {
  productId: number;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseRequest {
  supplierId: number;
  orderDate: string;
  paidAmount: number;
  notes?: string;
  items: PurchaseItemRequest[];
}

export interface PurchaseStats {
  totalPurchases: number;
  todayPurchases: number;
  monthPurchases: number;
  totalAmount: number;
  totalDebt: number;
  pendingReturns: number;
}

// Purchase Payment Types
export interface PurchasePayment {
  id: number;
  purchaseOrderId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  receivedByName: string;
  createdAt: string;
}

export interface PurchasePaymentRequest {
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
}

// Purchase Return Types
export interface PurchaseReturnItem {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  returnedQuantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PurchaseReturn {
  id: number;
  returnNumber: string;
  purchaseOrderId: number;
  purchaseOrderNumber: string;
  supplierId: number;
  supplierName: string;
  returnDate: string;
  reason: string;
  status: PurchaseReturnStatus;
  refundAmount: number;
  items: PurchaseReturnItem[];
  createdByName: string;
  approvedByName?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface PurchaseReturnItemRequest {
  productId: number;
  quantity: number;
}

export interface PurchaseReturnRequest {
  returnDate: string;
  reason: string;
  items: PurchaseReturnItemRequest[];
}

// Employee Types
export type EmployeeStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';

export interface Employee {
  id: number;
  // Asosiy maydonlar
  fullName: string;
  phone: string;
  email?: string;
  position: string;
  department?: string;
  salary?: number;
  hireDate: string;
  status: EmployeeStatus;
  // Kengaytirilgan maydonlar
  birthDate?: string;
  passportNumber?: string;
  address?: string;
  bankAccountNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  // User ma'lumotlari
  userId?: number;
  username?: string;
  userRole?: string;
  hasUserAccount: boolean;
  // Yangi yaratilgan credential'lar (faqat bir marta ko'rsatiladi)
  newCredentials?: CredentialsInfo;
}

export interface EmployeeRequest {
  fullName: string;
  phone: string;
  email?: string;
  position: string;
  department?: string;
  salary?: number;
  hireDate: string;
  status?: EmployeeStatus;
  birthDate?: string;
  passportNumber?: string;
  address?: string;
  bankAccountNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  userId?: number;
  // User yaratish
  createUserAccount?: boolean;
  roleCode?: string;
}

// Audit Log Detail Types
export * from './audit-log.types';

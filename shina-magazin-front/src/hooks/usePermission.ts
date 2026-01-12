import { useAuthStore } from '../store/authStore';

/**
 * Permission codes matching backend PermissionCode enum
 */
export const PermissionCode = {
  // DASHBOARD
  DASHBOARD_VIEW: 'DASHBOARD_VIEW',

  // PRODUCTS
  PRODUCTS_VIEW: 'PRODUCTS_VIEW',
  PRODUCTS_CREATE: 'PRODUCTS_CREATE',
  PRODUCTS_UPDATE: 'PRODUCTS_UPDATE',
  PRODUCTS_DELETE: 'PRODUCTS_DELETE',

  // BRANDS
  BRANDS_VIEW: 'BRANDS_VIEW',
  BRANDS_CREATE: 'BRANDS_CREATE',
  BRANDS_UPDATE: 'BRANDS_UPDATE',
  BRANDS_DELETE: 'BRANDS_DELETE',

  // CATEGORIES
  CATEGORIES_VIEW: 'CATEGORIES_VIEW',
  CATEGORIES_CREATE: 'CATEGORIES_CREATE',
  CATEGORIES_UPDATE: 'CATEGORIES_UPDATE',
  CATEGORIES_DELETE: 'CATEGORIES_DELETE',

  // SALES
  SALES_VIEW: 'SALES_VIEW',
  SALES_CREATE: 'SALES_CREATE',
  SALES_UPDATE: 'SALES_UPDATE',
  SALES_DELETE: 'SALES_DELETE',
  SALES_REFUND: 'SALES_REFUND',

  // CUSTOMERS
  CUSTOMERS_VIEW: 'CUSTOMERS_VIEW',
  CUSTOMERS_CREATE: 'CUSTOMERS_CREATE',
  CUSTOMERS_UPDATE: 'CUSTOMERS_UPDATE',
  CUSTOMERS_DELETE: 'CUSTOMERS_DELETE',

  // DEBTS
  DEBTS_VIEW: 'DEBTS_VIEW',
  DEBTS_CREATE: 'DEBTS_CREATE',
  DEBTS_UPDATE: 'DEBTS_UPDATE',
  DEBTS_DELETE: 'DEBTS_DELETE',
  DEBTS_PAY: 'DEBTS_PAY',

  // WAREHOUSE
  WAREHOUSE_VIEW: 'WAREHOUSE_VIEW',
  WAREHOUSE_CREATE: 'WAREHOUSE_CREATE',
  WAREHOUSE_UPDATE: 'WAREHOUSE_UPDATE',
  WAREHOUSE_DELETE: 'WAREHOUSE_DELETE',
  WAREHOUSE_ADJUST: 'WAREHOUSE_ADJUST',

  // SUPPLIERS
  SUPPLIERS_VIEW: 'SUPPLIERS_VIEW',
  SUPPLIERS_CREATE: 'SUPPLIERS_CREATE',
  SUPPLIERS_UPDATE: 'SUPPLIERS_UPDATE',
  SUPPLIERS_DELETE: 'SUPPLIERS_DELETE',

  // PURCHASES
  PURCHASES_VIEW: 'PURCHASES_VIEW',
  PURCHASES_CREATE: 'PURCHASES_CREATE',
  PURCHASES_UPDATE: 'PURCHASES_UPDATE',
  PURCHASES_DELETE: 'PURCHASES_DELETE',
  PURCHASES_RECEIVE: 'PURCHASES_RECEIVE',
  PURCHASES_RETURN: 'PURCHASES_RETURN',

  // REPORTS
  REPORTS_VIEW_SALES: 'REPORTS_VIEW_SALES',
  REPORTS_VIEW_WAREHOUSE: 'REPORTS_VIEW_WAREHOUSE',
  REPORTS_VIEW_DEBTS: 'REPORTS_VIEW_DEBTS',
  REPORTS_EXPORT: 'REPORTS_EXPORT',

  // EMPLOYEES
  EMPLOYEES_VIEW: 'EMPLOYEES_VIEW',
  EMPLOYEES_CREATE: 'EMPLOYEES_CREATE',
  EMPLOYEES_UPDATE: 'EMPLOYEES_UPDATE',
  EMPLOYEES_DELETE: 'EMPLOYEES_DELETE',

  // USERS
  USERS_VIEW: 'USERS_VIEW',
  USERS_CREATE: 'USERS_CREATE',
  USERS_UPDATE: 'USERS_UPDATE',
  USERS_DELETE: 'USERS_DELETE',
  USERS_CHANGE_ROLE: 'USERS_CHANGE_ROLE',

  // SETTINGS
  SETTINGS_VIEW: 'SETTINGS_VIEW',
  SETTINGS_UPDATE: 'SETTINGS_UPDATE',

  // NOTIFICATIONS
  NOTIFICATIONS_VIEW: 'NOTIFICATIONS_VIEW',
  NOTIFICATIONS_MANAGE: 'NOTIFICATIONS_MANAGE',

  // ROLES
  ROLES_VIEW: 'ROLES_VIEW',
  ROLES_CREATE: 'ROLES_CREATE',
  ROLES_UPDATE: 'ROLES_UPDATE',
  ROLES_DELETE: 'ROLES_DELETE',
} as const;

export type PermissionCodeType = (typeof PermissionCode)[keyof typeof PermissionCode];

/**
 * Hook for checking user permissions
 */
export function usePermission() {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole, permissions, roles } = useAuthStore();

  return {
    // Core permission checks
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,

    // All permissions and roles
    permissions,
    roles,

    // Convenience checks for common permissions
    canViewDashboard: hasPermission(PermissionCode.DASHBOARD_VIEW),

    // Products
    canViewProducts: hasPermission(PermissionCode.PRODUCTS_VIEW),
    canCreateProducts: hasPermission(PermissionCode.PRODUCTS_CREATE),
    canUpdateProducts: hasPermission(PermissionCode.PRODUCTS_UPDATE),
    canDeleteProducts: hasPermission(PermissionCode.PRODUCTS_DELETE),

    // Brands
    canViewBrands: hasPermission(PermissionCode.BRANDS_VIEW),
    canCreateBrands: hasPermission(PermissionCode.BRANDS_CREATE),
    canUpdateBrands: hasPermission(PermissionCode.BRANDS_UPDATE),
    canDeleteBrands: hasPermission(PermissionCode.BRANDS_DELETE),

    // Categories
    canViewCategories: hasPermission(PermissionCode.CATEGORIES_VIEW),
    canCreateCategories: hasPermission(PermissionCode.CATEGORIES_CREATE),
    canUpdateCategories: hasPermission(PermissionCode.CATEGORIES_UPDATE),
    canDeleteCategories: hasPermission(PermissionCode.CATEGORIES_DELETE),

    // Sales
    canViewSales: hasPermission(PermissionCode.SALES_VIEW),
    canCreateSales: hasPermission(PermissionCode.SALES_CREATE),
    canUpdateSales: hasPermission(PermissionCode.SALES_UPDATE),
    canDeleteSales: hasPermission(PermissionCode.SALES_DELETE),
    canRefundSales: hasPermission(PermissionCode.SALES_REFUND),

    // Customers
    canViewCustomers: hasPermission(PermissionCode.CUSTOMERS_VIEW),
    canCreateCustomers: hasPermission(PermissionCode.CUSTOMERS_CREATE),
    canUpdateCustomers: hasPermission(PermissionCode.CUSTOMERS_UPDATE),
    canDeleteCustomers: hasPermission(PermissionCode.CUSTOMERS_DELETE),

    // Debts
    canViewDebts: hasPermission(PermissionCode.DEBTS_VIEW),
    canCreateDebts: hasPermission(PermissionCode.DEBTS_CREATE),
    canUpdateDebts: hasPermission(PermissionCode.DEBTS_UPDATE),
    canDeleteDebts: hasPermission(PermissionCode.DEBTS_DELETE),
    canPayDebts: hasPermission(PermissionCode.DEBTS_PAY),

    // Warehouse
    canViewWarehouse: hasPermission(PermissionCode.WAREHOUSE_VIEW),
    canCreateWarehouse: hasPermission(PermissionCode.WAREHOUSE_CREATE),
    canUpdateWarehouse: hasPermission(PermissionCode.WAREHOUSE_UPDATE),
    canDeleteWarehouse: hasPermission(PermissionCode.WAREHOUSE_DELETE),
    canAdjustWarehouse: hasPermission(PermissionCode.WAREHOUSE_ADJUST),

    // Suppliers
    canViewSuppliers: hasPermission(PermissionCode.SUPPLIERS_VIEW),
    canCreateSuppliers: hasPermission(PermissionCode.SUPPLIERS_CREATE),
    canUpdateSuppliers: hasPermission(PermissionCode.SUPPLIERS_UPDATE),
    canDeleteSuppliers: hasPermission(PermissionCode.SUPPLIERS_DELETE),

    // Purchases
    canViewPurchases: hasPermission(PermissionCode.PURCHASES_VIEW),
    canCreatePurchases: hasPermission(PermissionCode.PURCHASES_CREATE),
    canUpdatePurchases: hasPermission(PermissionCode.PURCHASES_UPDATE),
    canDeletePurchases: hasPermission(PermissionCode.PURCHASES_DELETE),
    canReceivePurchases: hasPermission(PermissionCode.PURCHASES_RECEIVE),
    canReturnPurchases: hasPermission(PermissionCode.PURCHASES_RETURN),

    // Reports
    canViewSalesReports: hasPermission(PermissionCode.REPORTS_VIEW_SALES),
    canViewWarehouseReports: hasPermission(PermissionCode.REPORTS_VIEW_WAREHOUSE),
    canViewDebtsReports: hasPermission(PermissionCode.REPORTS_VIEW_DEBTS),
    canExportReports: hasPermission(PermissionCode.REPORTS_EXPORT),
    canViewReports: hasAnyPermission(
      PermissionCode.REPORTS_VIEW_SALES,
      PermissionCode.REPORTS_VIEW_WAREHOUSE,
      PermissionCode.REPORTS_VIEW_DEBTS
    ),

    // Employees
    canViewEmployees: hasPermission(PermissionCode.EMPLOYEES_VIEW),
    canCreateEmployees: hasPermission(PermissionCode.EMPLOYEES_CREATE),
    canUpdateEmployees: hasPermission(PermissionCode.EMPLOYEES_UPDATE),
    canDeleteEmployees: hasPermission(PermissionCode.EMPLOYEES_DELETE),

    // Users
    canViewUsers: hasPermission(PermissionCode.USERS_VIEW),
    canCreateUsers: hasPermission(PermissionCode.USERS_CREATE),
    canUpdateUsers: hasPermission(PermissionCode.USERS_UPDATE),
    canDeleteUsers: hasPermission(PermissionCode.USERS_DELETE),
    canChangeUserRole: hasPermission(PermissionCode.USERS_CHANGE_ROLE),

    // Settings
    canViewSettings: hasPermission(PermissionCode.SETTINGS_VIEW),
    canUpdateSettings: hasPermission(PermissionCode.SETTINGS_UPDATE),

    // Notifications
    canViewNotifications: hasPermission(PermissionCode.NOTIFICATIONS_VIEW),
    canManageNotifications: hasPermission(PermissionCode.NOTIFICATIONS_MANAGE),

    // Roles
    canViewRoles: hasPermission(PermissionCode.ROLES_VIEW),
    canCreateRoles: hasPermission(PermissionCode.ROLES_CREATE),
    canUpdateRoles: hasPermission(PermissionCode.ROLES_UPDATE),
    canDeleteRoles: hasPermission(PermissionCode.ROLES_DELETE),
  };
}

import { useCallback, useMemo } from 'react';
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
  EMPLOYEES_CHANGE_ROLE: 'EMPLOYEES_CHANGE_ROLE',
  EMPLOYEES_MANAGE_ACCESS: 'EMPLOYEES_MANAGE_ACCESS',

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
  // ✅ Use Zustand selectors to subscribe to specific state
  const permissions = useAuthStore((state) => state.permissions);
  const roles = useAuthStore((state) => state.roles);

  // ✅ Memoize functions with permissions/roles dependencies
  const hasPermission = useCallback(
    (permission: string) => permissions.has(permission),
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (...perms: string[]) => perms.some(p => permissions.has(p)),
    [permissions]
  );

  const hasAllPermissions = useCallback(
    (...perms: string[]) => perms.every(p => permissions.has(p)),
    [permissions]
  );

  const hasRole = useCallback(
    (role: string) => roles.has(role),
    [roles]
  );

  // ✅ Use useMemo for all convenience permission checks
  const canViewDashboard = useMemo(
    () => permissions.has(PermissionCode.DASHBOARD_VIEW),
    [permissions]
  );

  // Products
  const canViewProducts = useMemo(
    () => permissions.has(PermissionCode.PRODUCTS_VIEW),
    [permissions]
  );

  const canCreateProducts = useMemo(
    () => permissions.has(PermissionCode.PRODUCTS_CREATE),
    [permissions]
  );

  const canUpdateProducts = useMemo(
    () => permissions.has(PermissionCode.PRODUCTS_UPDATE),
    [permissions]
  );

  const canDeleteProducts = useMemo(
    () => permissions.has(PermissionCode.PRODUCTS_DELETE),
    [permissions]
  );

  // Brands
  const canViewBrands = useMemo(
    () => permissions.has(PermissionCode.BRANDS_VIEW),
    [permissions]
  );

  const canCreateBrands = useMemo(
    () => permissions.has(PermissionCode.BRANDS_CREATE),
    [permissions]
  );

  const canUpdateBrands = useMemo(
    () => permissions.has(PermissionCode.BRANDS_UPDATE),
    [permissions]
  );

  const canDeleteBrands = useMemo(
    () => permissions.has(PermissionCode.BRANDS_DELETE),
    [permissions]
  );

  // Categories
  const canViewCategories = useMemo(
    () => permissions.has(PermissionCode.CATEGORIES_VIEW),
    [permissions]
  );

  const canCreateCategories = useMemo(
    () => permissions.has(PermissionCode.CATEGORIES_CREATE),
    [permissions]
  );

  const canUpdateCategories = useMemo(
    () => permissions.has(PermissionCode.CATEGORIES_UPDATE),
    [permissions]
  );

  const canDeleteCategories = useMemo(
    () => permissions.has(PermissionCode.CATEGORIES_DELETE),
    [permissions]
  );

  // Sales
  const canViewSales = useMemo(
    () => permissions.has(PermissionCode.SALES_VIEW),
    [permissions]
  );

  const canCreateSales = useMemo(
    () => permissions.has(PermissionCode.SALES_CREATE),
    [permissions]
  );

  const canUpdateSales = useMemo(
    () => permissions.has(PermissionCode.SALES_UPDATE),
    [permissions]
  );

  const canDeleteSales = useMemo(
    () => permissions.has(PermissionCode.SALES_DELETE),
    [permissions]
  );

  const canRefundSales = useMemo(
    () => permissions.has(PermissionCode.SALES_REFUND),
    [permissions]
  );

  // Customers
  const canViewCustomers = useMemo(
    () => permissions.has(PermissionCode.CUSTOMERS_VIEW),
    [permissions]
  );

  const canCreateCustomers = useMemo(
    () => permissions.has(PermissionCode.CUSTOMERS_CREATE),
    [permissions]
  );

  const canUpdateCustomers = useMemo(
    () => permissions.has(PermissionCode.CUSTOMERS_UPDATE),
    [permissions]
  );

  const canDeleteCustomers = useMemo(
    () => permissions.has(PermissionCode.CUSTOMERS_DELETE),
    [permissions]
  );

  // Debts
  const canViewDebts = useMemo(
    () => permissions.has(PermissionCode.DEBTS_VIEW),
    [permissions]
  );

  const canCreateDebts = useMemo(
    () => permissions.has(PermissionCode.DEBTS_CREATE),
    [permissions]
  );

  const canUpdateDebts = useMemo(
    () => permissions.has(PermissionCode.DEBTS_UPDATE),
    [permissions]
  );

  const canDeleteDebts = useMemo(
    () => permissions.has(PermissionCode.DEBTS_DELETE),
    [permissions]
  );

  const canPayDebts = useMemo(
    () => permissions.has(PermissionCode.DEBTS_PAY),
    [permissions]
  );

  // Warehouse
  const canViewWarehouse = useMemo(
    () => permissions.has(PermissionCode.WAREHOUSE_VIEW),
    [permissions]
  );

  const canCreateWarehouse = useMemo(
    () => permissions.has(PermissionCode.WAREHOUSE_CREATE),
    [permissions]
  );

  const canUpdateWarehouse = useMemo(
    () => permissions.has(PermissionCode.WAREHOUSE_UPDATE),
    [permissions]
  );

  const canDeleteWarehouse = useMemo(
    () => permissions.has(PermissionCode.WAREHOUSE_DELETE),
    [permissions]
  );

  const canAdjustWarehouse = useMemo(
    () => permissions.has(PermissionCode.WAREHOUSE_ADJUST),
    [permissions]
  );

  // Suppliers
  const canViewSuppliers = useMemo(
    () => permissions.has(PermissionCode.SUPPLIERS_VIEW),
    [permissions]
  );

  const canCreateSuppliers = useMemo(
    () => permissions.has(PermissionCode.SUPPLIERS_CREATE),
    [permissions]
  );

  const canUpdateSuppliers = useMemo(
    () => permissions.has(PermissionCode.SUPPLIERS_UPDATE),
    [permissions]
  );

  const canDeleteSuppliers = useMemo(
    () => permissions.has(PermissionCode.SUPPLIERS_DELETE),
    [permissions]
  );

  // Purchases
  const canViewPurchases = useMemo(
    () => permissions.has(PermissionCode.PURCHASES_VIEW),
    [permissions]
  );

  const canCreatePurchases = useMemo(
    () => permissions.has(PermissionCode.PURCHASES_CREATE),
    [permissions]
  );

  const canUpdatePurchases = useMemo(
    () => permissions.has(PermissionCode.PURCHASES_UPDATE),
    [permissions]
  );

  const canDeletePurchases = useMemo(
    () => permissions.has(PermissionCode.PURCHASES_DELETE),
    [permissions]
  );

  const canReceivePurchases = useMemo(
    () => permissions.has(PermissionCode.PURCHASES_RECEIVE),
    [permissions]
  );

  const canReturnPurchases = useMemo(
    () => permissions.has(PermissionCode.PURCHASES_RETURN),
    [permissions]
  );

  // Reports
  const canViewSalesReports = useMemo(
    () => permissions.has(PermissionCode.REPORTS_VIEW_SALES),
    [permissions]
  );

  const canViewWarehouseReports = useMemo(
    () => permissions.has(PermissionCode.REPORTS_VIEW_WAREHOUSE),
    [permissions]
  );

  const canViewDebtsReports = useMemo(
    () => permissions.has(PermissionCode.REPORTS_VIEW_DEBTS),
    [permissions]
  );

  const canExportReports = useMemo(
    () => permissions.has(PermissionCode.REPORTS_EXPORT),
    [permissions]
  );

  const canViewReports = useMemo(
    () =>
      permissions.has(PermissionCode.REPORTS_VIEW_SALES) ||
      permissions.has(PermissionCode.REPORTS_VIEW_WAREHOUSE) ||
      permissions.has(PermissionCode.REPORTS_VIEW_DEBTS),
    [permissions]
  );

  // Employees
  const canViewEmployees = useMemo(
    () => permissions.has(PermissionCode.EMPLOYEES_VIEW),
    [permissions]
  );

  const canCreateEmployees = useMemo(
    () => permissions.has(PermissionCode.EMPLOYEES_CREATE),
    [permissions]
  );

  const canUpdateEmployees = useMemo(
    () => permissions.has(PermissionCode.EMPLOYEES_UPDATE),
    [permissions]
  );

  const canDeleteEmployees = useMemo(
    () => permissions.has(PermissionCode.EMPLOYEES_DELETE),
    [permissions]
  );

  const canChangeEmployeeRole = useMemo(
    () => permissions.has(PermissionCode.EMPLOYEES_CHANGE_ROLE),
    [permissions]
  );

  const canManageEmployeeAccess = useMemo(
    () => permissions.has(PermissionCode.EMPLOYEES_MANAGE_ACCESS),
    [permissions]
  );

  // Users
  const canViewUsers = useMemo(
    () => permissions.has(PermissionCode.USERS_VIEW),
    [permissions]
  );

  const canCreateUsers = useMemo(
    () => permissions.has(PermissionCode.USERS_CREATE),
    [permissions]
  );

  const canUpdateUsers = useMemo(
    () => permissions.has(PermissionCode.USERS_UPDATE),
    [permissions]
  );

  const canDeleteUsers = useMemo(
    () => permissions.has(PermissionCode.USERS_DELETE),
    [permissions]
  );

  const canChangeUserRole = useMemo(
    () => permissions.has(PermissionCode.USERS_CHANGE_ROLE),
    [permissions]
  );

  // Settings
  const canViewSettings = useMemo(
    () => permissions.has(PermissionCode.SETTINGS_VIEW),
    [permissions]
  );

  const canUpdateSettings = useMemo(
    () => permissions.has(PermissionCode.SETTINGS_UPDATE),
    [permissions]
  );

  // Notifications
  const canViewNotifications = useMemo(
    () => permissions.has(PermissionCode.NOTIFICATIONS_VIEW),
    [permissions]
  );

  const canManageNotifications = useMemo(
    () => permissions.has(PermissionCode.NOTIFICATIONS_MANAGE),
    [permissions]
  );

  // Roles
  const canViewRoles = useMemo(
    () => permissions.has(PermissionCode.ROLES_VIEW),
    [permissions]
  );

  const canCreateRoles = useMemo(
    () => permissions.has(PermissionCode.ROLES_CREATE),
    [permissions]
  );

  const canUpdateRoles = useMemo(
    () => permissions.has(PermissionCode.ROLES_UPDATE),
    [permissions]
  );

  const canDeleteRoles = useMemo(
    () => permissions.has(PermissionCode.ROLES_DELETE),
    [permissions]
  );

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
    canViewDashboard,

    // Products
    canViewProducts,
    canCreateProducts,
    canUpdateProducts,
    canDeleteProducts,

    // Brands
    canViewBrands,
    canCreateBrands,
    canUpdateBrands,
    canDeleteBrands,

    // Categories
    canViewCategories,
    canCreateCategories,
    canUpdateCategories,
    canDeleteCategories,

    // Sales
    canViewSales,
    canCreateSales,
    canUpdateSales,
    canDeleteSales,
    canRefundSales,

    // Customers
    canViewCustomers,
    canCreateCustomers,
    canUpdateCustomers,
    canDeleteCustomers,

    // Debts
    canViewDebts,
    canCreateDebts,
    canUpdateDebts,
    canDeleteDebts,
    canPayDebts,

    // Warehouse
    canViewWarehouse,
    canCreateWarehouse,
    canUpdateWarehouse,
    canDeleteWarehouse,
    canAdjustWarehouse,

    // Suppliers
    canViewSuppliers,
    canCreateSuppliers,
    canUpdateSuppliers,
    canDeleteSuppliers,

    // Purchases
    canViewPurchases,
    canCreatePurchases,
    canUpdatePurchases,
    canDeletePurchases,
    canReceivePurchases,
    canReturnPurchases,

    // Reports
    canViewSalesReports,
    canViewWarehouseReports,
    canViewDebtsReports,
    canExportReports,
    canViewReports,

    // Employees
    canViewEmployees,
    canCreateEmployees,
    canUpdateEmployees,
    canDeleteEmployees,
    canChangeEmployeeRole,
    canManageEmployeeAccess,

    // Users
    canViewUsers,
    canCreateUsers,
    canUpdateUsers,
    canDeleteUsers,
    canChangeUserRole,

    // Settings
    canViewSettings,
    canUpdateSettings,

    // Notifications
    canViewNotifications,
    canManageNotifications,

    // Roles
    canViewRoles,
    canCreateRoles,
    canUpdateRoles,
    canDeleteRoles,
  };
}

import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { PermissionCode } from '../hooks/usePermission';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ChangePasswordPage } from '../pages/auth/ChangePasswordPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { ProductsPage } from '../pages/products/ProductsPage';
import { ProductDetailPage } from '../pages/products/ProductDetailPage';
import { CustomersPage } from '../pages/customers/CustomersPage';
import { POSPage } from '../pages/sales/POSPage';
import { SalesPage } from '../pages/sales/SalesPage';
import { DebtsPage } from '../pages/debts/DebtsPage';
import { WarehousePage } from '../pages/warehouse/WarehousePage';
import { SuppliersPage } from '../pages/suppliers/SuppliersPage';
import { PurchasesPage } from '../pages/purchases/PurchasesPage';
import { PurchaseDetailPage } from '../pages/purchases/PurchaseDetailPage';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { NotificationsPage } from '../pages/notifications/NotificationsPage';
import { ReportsPage } from '../pages/reports/ReportsPage';
import { EmployeesPage } from '../pages/employees/EmployeesPage';
import { RolesPage } from '../pages/roles/RolesPage';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { AuditLogsPage } from '../pages/audit-logs/AuditLogsPage';

// Portal imports
import PortalLayout from '../portal/components/layout/PortalLayout';
import PortalLoginPage from '../portal/pages/LoginPage';
import PortalDashboardPage from '../portal/pages/DashboardPage';
import PortalPurchasesPage from '../portal/pages/PurchasesPage';
import PortalPurchaseDetailPage from '../portal/pages/PurchaseDetailPage';
import PortalDebtsPage from '../portal/pages/DebtsPage';
import PortalProfilePage from '../portal/pages/ProfilePage';
import PortalNotificationsPage from '../portal/pages/NotificationsPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
    handle: { title: 'Kirish' },
  },
  {
    path: '/register',
    element: <RegisterPage />,
    handle: { title: "Ro'yxatdan o'tish" },
  },
  {
    path: '/change-password',
    element: <ChangePasswordPage />,
    handle: { title: "Parolni o'zgartirish" },
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute permission={PermissionCode.DASHBOARD_VIEW}>
            <DashboardPage />
          </ProtectedRoute>
        ),
        handle: { title: 'Dashboard' },
      },
      {
        path: 'products',
        element: (
          <ProtectedRoute permission={PermissionCode.PRODUCTS_VIEW}>
            <ProductsPage />
          </ProtectedRoute>
        ),
        handle: { title: 'Mahsulotlar' },
      },
      {
        path: 'products/:id',
        element: (
          <ProtectedRoute permission={PermissionCode.PRODUCTS_VIEW}>
            <ProductDetailPage />
          </ProtectedRoute>
        ),
        handle: { title: 'Mahsulot tafsiloti' },
      },
      {
        path: 'pos',
        element: (
          <ProtectedRoute permission={PermissionCode.SALES_CREATE}>
            <POSPage />
          </ProtectedRoute>
        ),
        handle: { title: 'Kassa (POS)' },
      },
      {
        path: 'sales',
        element: (
          <ProtectedRoute permission={PermissionCode.SALES_VIEW}>
            <SalesPage />
          </ProtectedRoute>
        ),
        handle: { title: 'Sotuvlar' },
      },
      {
        path: 'customers',
        element: (
          <ProtectedRoute permission={PermissionCode.CUSTOMERS_VIEW}>
            <CustomersPage />
          </ProtectedRoute>
        ),
        handle: { title: 'Mijozlar' },
      },
      {
        path: 'debts',
        element: (
          <ProtectedRoute permission={PermissionCode.DEBTS_VIEW}>
            <DebtsPage />
          </ProtectedRoute>
        ),
        handle: { title: 'Qarzlar' },
      },
      {
        path: 'warehouse',
        element: (
          <ProtectedRoute permission={PermissionCode.WAREHOUSE_VIEW}>
            <WarehousePage />
          </ProtectedRoute>
        ),
        handle: { title: 'Ombor' },
      },
      {
        path: 'suppliers',
        element: (
          <ProtectedRoute permission={PermissionCode.SUPPLIERS_VIEW}>
            <SuppliersPage />
          </ProtectedRoute>
        ),
        handle: { title: "Ta'minotchilar" },
      },
      {
        path: 'purchases',
        element: (
          <ProtectedRoute permission={PermissionCode.PURCHASES_VIEW}>
            <PurchasesPage />
          </ProtectedRoute>
        ),
        handle: { title: 'Xaridlar' },
      },
      {
        path: 'purchases/:id',
        element: (
          <ProtectedRoute permission={PermissionCode.PURCHASES_VIEW}>
            <PurchaseDetailPage />
          </ProtectedRoute>
        ),
        handle: { title: 'Xarid tafsiloti' },
      },
      {
        path: 'reports',
        element: (
          <ProtectedRoute
            permission={[
              PermissionCode.REPORTS_VIEW_SALES,
              PermissionCode.REPORTS_VIEW_WAREHOUSE,
              PermissionCode.REPORTS_VIEW_DEBTS,
            ]}
          >
            <ReportsPage />
          </ProtectedRoute>
        ),
        handle: { title: 'Hisobotlar' },
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute permission={PermissionCode.SETTINGS_VIEW}>
            <SettingsPage />
          </ProtectedRoute>
        ),
        handle: { title: 'Sozlamalar' },
      },
      {
        path: 'employees',
        element: (
          <ProtectedRoute permission={PermissionCode.EMPLOYEES_VIEW}>
            <EmployeesPage />
          </ProtectedRoute>
        ),
        handle: { title: 'Xodimlar' },
      },
      {
        path: 'roles',
        element: (
          <ProtectedRoute permission={PermissionCode.ROLES_VIEW}>
            <RolesPage />
          </ProtectedRoute>
        ),
        handle: { title: 'Rollar' },
      },
      {
        path: 'notifications',
        element: (
          <ProtectedRoute permission={PermissionCode.NOTIFICATIONS_VIEW}>
            <NotificationsPage />
          </ProtectedRoute>
        ),
        handle: { title: 'Bildirishnomalar' },
      },
      {
        path: 'audit-logs',
        element: (
          <ProtectedRoute permission={PermissionCode.SETTINGS_VIEW}>
            <AuditLogsPage />
          </ProtectedRoute>
        ),
        handle: { title: 'Audit Loglar' },
      },
      {
        path: 'profile',
        // Profile page - no permission required, all authenticated users can access
        element: <ProfilePage />,
        handle: { title: 'Profil' },
      },
    ],
  },
  // Customer Portal Routes
  {
    path: '/kabinet/kirish',
    element: <PortalLoginPage />,
    handle: { title: 'Mijoz Portali - Kirish' },
  },
  {
    path: '/kabinet',
    element: <PortalLayout />,
    children: [
      {
        index: true,
        element: <PortalDashboardPage />,
        handle: { title: 'Bosh sahifa' },
      },
      {
        path: 'xaridlar',
        element: <PortalPurchasesPage />,
        handle: { title: 'Xaridlar' },
      },
      {
        path: 'xaridlar/:id',
        element: <PortalPurchaseDetailPage />,
        handle: { title: 'Xarid tafsilotlari' },
      },
      {
        path: 'qarzlar',
        element: <PortalDebtsPage />,
        handle: { title: 'Qarzlar' },
      },
      {
        path: 'bildirishnomalar',
        element: <PortalNotificationsPage />,
        handle: { title: 'Bildirishnomalar' },
      },
      {
        path: 'profil',
        element: <PortalProfilePage />,
        handle: { title: 'Profil' },
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

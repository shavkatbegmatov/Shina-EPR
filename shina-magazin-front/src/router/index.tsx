import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { PageLoader } from '../components/common/PageLoader';
import { PermissionCode } from '../hooks/usePermission';

// Auth pages (small, load immediately)
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ChangePasswordPage } from '../pages/auth/ChangePasswordPage';

// Lazy-loaded main app pages
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ProductsPage = lazy(() => import('../pages/products/ProductsPage').then(m => ({ default: m.ProductsPage })));
const ProductDetailPage = lazy(() => import('../pages/products/ProductDetailPage').then(m => ({ default: m.ProductDetailPage })));
const CustomersPage = lazy(() => import('../pages/customers/CustomersPage').then(m => ({ default: m.CustomersPage })));
const CustomerDetailPage = lazy(() => import('../pages/customers/CustomerDetailPage').then(m => ({ default: m.CustomerDetailPage })));
const POSPage = lazy(() => import('../pages/sales/POSPage').then(m => ({ default: m.POSPage })));
const SalesPage = lazy(() => import('../pages/sales/SalesPage').then(m => ({ default: m.SalesPage })));
const SaleDetailPage = lazy(() => import('../pages/sales/SaleDetailPage').then(m => ({ default: m.SaleDetailPage })));
const DebtsPage = lazy(() => import('../pages/debts/DebtsPage').then(m => ({ default: m.DebtsPage })));
const WarehousePage = lazy(() => import('../pages/warehouse/WarehousePage').then(m => ({ default: m.WarehousePage })));
const SuppliersPage = lazy(() => import('../pages/suppliers/SuppliersPage').then(m => ({ default: m.SuppliersPage })));
const SupplierDetailPage = lazy(() => import('../pages/suppliers/SupplierDetailPage').then(m => ({ default: m.SupplierDetailPage })));
const PurchasesPage = lazy(() => import('../pages/purchases/PurchasesPage').then(m => ({ default: m.PurchasesPage })));
const PurchaseDetailPage = lazy(() => import('../pages/purchases/PurchaseDetailPage').then(m => ({ default: m.PurchaseDetailPage })));
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const NotificationsPage = lazy(() => import('../pages/notifications/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const ReportsPage = lazy(() => import('../pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
const EmployeesPage = lazy(() => import('../pages/employees/EmployeesPage').then(m => ({ default: m.EmployeesPage })));
const EmployeeDetailPage = lazy(() => import('../pages/employees/EmployeeDetailPage').then(m => ({ default: m.EmployeeDetailPage })));
const RolesPage = lazy(() => import('../pages/roles/RolesPage').then(m => ({ default: m.RolesPage })));
const ProfilePage = lazy(() => import('../pages/profile/ProfilePage').then(m => ({ default: m.ProfilePage })));
const AuditLogsPage = lazy(() => import('../pages/audit-logs/AuditLogsPage').then(m => ({ default: m.AuditLogsPage })));

// Lazy-loaded portal pages
const PortalLayout = lazy(() => import('../portal/components/layout/PortalLayout'));
const PortalLoginPage = lazy(() => import('../portal/pages/LoginPage'));
const PortalDashboardPage = lazy(() => import('../portal/pages/DashboardPage'));
const PortalPurchasesPage = lazy(() => import('../portal/pages/PurchasesPage'));
const PortalPurchaseDetailPage = lazy(() => import('../portal/pages/PurchaseDetailPage'));
const PortalDebtsPage = lazy(() => import('../portal/pages/DebtsPage'));
const PortalProfilePage = lazy(() => import('../portal/pages/ProfilePage'));
const PortalNotificationsPage = lazy(() => import('../portal/pages/NotificationsPage'));

// Helper component for lazy routes with Suspense
function LazyRoute({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

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
            <LazyRoute>
              <DashboardPage />
            </LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Dashboard' },
      },
      {
        path: 'products',
        element: (
          <ProtectedRoute permission={PermissionCode.PRODUCTS_VIEW}>
            <LazyRoute>
              <ProductsPage />
            </LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Mahsulotlar' },
      },
      {
        path: 'products/:id',
        element: (
          <ProtectedRoute permission={PermissionCode.PRODUCTS_VIEW}>
            <LazyRoute>
              <ProductDetailPage />
            </LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Mahsulot tafsiloti' },
      },
      {
        path: 'pos',
        element: (
          <ProtectedRoute permission={PermissionCode.SALES_CREATE}>
            <LazyRoute>
              <POSPage />
            </LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Kassa (POS)' },
      },
      {
        path: 'sales',
        element: (
          <ProtectedRoute permission={PermissionCode.SALES_VIEW}>
            <LazyRoute>
              <SalesPage />
            </LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Sotuvlar' },
      },
      {
        path: 'sales/:id',
        element: (
          <ProtectedRoute permission={PermissionCode.SALES_VIEW}>
            <LazyRoute>
              <SaleDetailPage />
            </LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Sotuv tafsiloti' },
      },
      {
        path: 'customers',
        element: (
          <ProtectedRoute permission={PermissionCode.CUSTOMERS_VIEW}>
            <LazyRoute>
              <CustomersPage />
            </LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Mijozlar' },
      },
      {
        path: 'customers/:id',
        element: (
          <ProtectedRoute permission={PermissionCode.CUSTOMERS_VIEW}>
            <LazyRoute>
              <CustomerDetailPage />
            </LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Mijoz tafsiloti' },
      },
      {
        path: 'debts',
        element: (
          <ProtectedRoute permission={PermissionCode.DEBTS_VIEW}>
            <LazyRoute>
              <DebtsPage />
            </LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Qarzlar' },
      },
      {
        path: 'warehouse',
        element: (
          <ProtectedRoute permission={PermissionCode.WAREHOUSE_VIEW}>
            <LazyRoute>
              <WarehousePage />
            </LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Ombor' },
      },
      {
        path: 'suppliers',
        element: (
          <ProtectedRoute permission={PermissionCode.SUPPLIERS_VIEW}>
            <LazyRoute>
              <SuppliersPage />
            </LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: "Ta'minotchilar" },
      },
      {
        path: 'suppliers/:id',
        element: (
          <ProtectedRoute permission={PermissionCode.SUPPLIERS_VIEW}>
            <LazyRoute>
              <SupplierDetailPage />
            </LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: "Ta'minotchi tafsiloti" },
      },
      {
        path: 'purchases',
        element: (
          <ProtectedRoute permission={PermissionCode.PURCHASES_VIEW}>
            <LazyRoute>
              <PurchasesPage />
            </LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Xaridlar' },
      },
      {
        path: 'purchases/:id',
        element: (
          <ProtectedRoute permission={PermissionCode.PURCHASES_VIEW}>
            <LazyRoute>
              <PurchaseDetailPage />
            </LazyRoute>
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
            <LazyRoute>
              <ReportsPage />
            </LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Hisobotlar' },
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute permission={PermissionCode.SETTINGS_VIEW}>
            <LazyRoute>
              <SettingsPage />
            </LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Sozlamalar' },
      },
      {
        path: 'employees',
        element: (
          <ProtectedRoute permission={PermissionCode.EMPLOYEES_VIEW}>
            <LazyRoute>
              <EmployeesPage />
            </LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Xodimlar' },
      },
      {
        path: 'employees/:id',
        element: (
          <ProtectedRoute permission={PermissionCode.EMPLOYEES_VIEW}>
            <LazyRoute>
              <EmployeeDetailPage />
            </LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Xodim tafsiloti' },
      },
      {
        path: 'roles',
        element: (
          <ProtectedRoute permission={PermissionCode.ROLES_VIEW}>
            <LazyRoute>
              <RolesPage />
            </LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Rollar' },
      },
      {
        path: 'notifications',
        element: (
          <ProtectedRoute permission={PermissionCode.NOTIFICATIONS_VIEW}>
            <LazyRoute>
              <NotificationsPage />
            </LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Bildirishnomalar' },
      },
      {
        path: 'audit-logs',
        element: (
          <ProtectedRoute permission={PermissionCode.SETTINGS_VIEW}>
            <LazyRoute>
              <AuditLogsPage />
            </LazyRoute>
          </ProtectedRoute>
        ),
        handle: { title: 'Audit Loglar' },
      },
      {
        path: 'profile',
        // Profile page - no permission required, all authenticated users can access
        element: (
          <LazyRoute>
            <ProfilePage />
          </LazyRoute>
        ),
        handle: { title: 'Profil' },
      },
    ],
  },
  // Customer Portal Routes
  {
    path: '/kabinet/kirish',
    element: (
      <LazyRoute>
        <PortalLoginPage />
      </LazyRoute>
    ),
    handle: { title: 'Mijoz Portali - Kirish' },
  },
  {
    path: '/kabinet',
    element: (
      <LazyRoute>
        <PortalLayout />
      </LazyRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <LazyRoute>
            <PortalDashboardPage />
          </LazyRoute>
        ),
        handle: { title: 'Bosh sahifa' },
      },
      {
        path: 'xaridlar',
        element: (
          <LazyRoute>
            <PortalPurchasesPage />
          </LazyRoute>
        ),
        handle: { title: 'Xaridlar' },
      },
      {
        path: 'xaridlar/:id',
        element: (
          <LazyRoute>
            <PortalPurchaseDetailPage />
          </LazyRoute>
        ),
        handle: { title: 'Xarid tafsilotlari' },
      },
      {
        path: 'qarzlar',
        element: (
          <LazyRoute>
            <PortalDebtsPage />
          </LazyRoute>
        ),
        handle: { title: 'Qarzlar' },
      },
      {
        path: 'bildirishnomalar',
        element: (
          <LazyRoute>
            <PortalNotificationsPage />
          </LazyRoute>
        ),
        handle: { title: 'Bildirishnomalar' },
      },
      {
        path: 'profil',
        element: (
          <LazyRoute>
            <PortalProfilePage />
          </LazyRoute>
        ),
        handle: { title: 'Profil' },
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

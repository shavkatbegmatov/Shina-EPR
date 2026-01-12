import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { ProductsPage } from '../pages/products/ProductsPage';
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
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
        handle: { title: 'Dashboard' },
      },
      {
        path: 'products',
        element: <ProductsPage />,
        handle: { title: 'Mahsulotlar' },
      },
      {
        path: 'pos',
        element: <POSPage />,
        handle: { title: 'Kassa (POS)' },
      },
      {
        path: 'sales',
        element: <SalesPage />,
        handle: { title: 'Sotuvlar' },
      },
      {
        path: 'customers',
        element: <CustomersPage />,
        handle: { title: 'Mijozlar' },
      },
      {
        path: 'debts',
        element: <DebtsPage />,
        handle: { title: 'Qarzlar' },
      },
      {
        path: 'warehouse',
        element: <WarehousePage />,
        handle: { title: 'Ombor' },
      },
      {
        path: 'suppliers',
        element: <SuppliersPage />,
        handle: { title: "Ta'minotchilar" },
      },
      {
        path: 'purchases',
        element: <PurchasesPage />,
        handle: { title: 'Xaridlar' },
      },
      {
        path: 'purchases/:id',
        element: <PurchaseDetailPage />,
        handle: { title: 'Xarid tafsiloti' },
      },
      {
        path: 'reports',
        element: <ReportsPage />,
        handle: { title: 'Hisobotlar' },
      },
      {
        path: 'settings',
        element: <SettingsPage />,
        handle: { title: 'Sozlamalar' },
      },
      {
        path: 'employees',
        element: <EmployeesPage />,
        handle: { title: 'Xodimlar' },
      },
      {
        path: 'notifications',
        element: <NotificationsPage />,
        handle: { title: 'Bildirishnomalar' },
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

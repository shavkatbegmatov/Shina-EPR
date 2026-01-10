import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { PlaceholderPage } from '../components/common/PlaceholderPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { ProductsPage } from '../pages/products/ProductsPage';
import { CustomersPage } from '../pages/customers/CustomersPage';
import { POSPage } from '../pages/sales/POSPage';
import { SalesPage } from '../pages/sales/SalesPage';
import { DebtsPage } from '../pages/debts/DebtsPage';
import { WarehousePage } from '../pages/warehouse/WarehousePage';
import { SettingsPage } from '../pages/settings/SettingsPage';

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
    handle: { title: 'Kirish', description: 'Shaxsiy kabinetingizga kirish' },
  },
  {
    path: '/register',
    element: <RegisterPage />,
    handle: { title: "Ro'yxatdan o'tish", description: "Yangi hisob so'rovi" },
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
        handle: { title: 'Dashboard', description: "Umumiy ko'rsatkichlar" },
      },
      {
        path: 'products',
        element: <ProductsPage />,
        handle: { title: 'Mahsulotlar', description: 'Shina katalogi' },
      },
      {
        path: 'pos',
        element: <POSPage />,
        handle: { title: 'Kassa (POS)', description: 'Savdo jarayoni' },
      },
      {
        path: 'sales',
        element: <SalesPage />,
        handle: { title: 'Sotuvlar', description: 'Sotuvlar tarixi' },
      },
      {
        path: 'customers',
        element: <CustomersPage />,
        handle: { title: 'Mijozlar', description: 'Mijozlar bazasi' },
      },
      {
        path: 'debts',
        element: <DebtsPage />,
        handle: { title: 'Qarzlar', description: 'Qarz va balans nazorati' },
      },
      {
        path: 'warehouse',
        element: <WarehousePage />,
        handle: { title: 'Ombor', description: 'Zaxira va kirim-chiqim' },
      },
      {
        path: 'suppliers',
        element: (
          <PlaceholderPage
            title="Ta'minotchilar"
            description="Hamkorlar va yetkazib beruvchilar bilan ishlash."
          />
        ),
        handle: { title: "Ta'minotchilar", description: "Hamkorlar ro'yxati" },
      },
      {
        path: 'reports',
        element: (
          <PlaceholderPage
            title="Hisobotlar"
            description="Analitika, eksport va vizual hisobotlar."
          />
        ),
        handle: { title: 'Hisobotlar', description: 'Analitika va eksportlar' },
      },
      {
        path: 'settings',
        element: <SettingsPage />,
        handle: { title: 'Sozlamalar', description: 'Tizim sozlamalari' },
      },
    ],
  },
  // Customer Portal Routes
  {
    path: '/kabinet/kirish',
    element: <PortalLoginPage />,
    handle: { title: 'Mijoz Portali - Kirish', description: 'Mijoz shaxsiy kabinetiga kirish' },
  },
  {
    path: '/kabinet',
    element: <PortalLayout />,
    children: [
      {
        index: true,
        element: <PortalDashboardPage />,
        handle: { title: 'Bosh sahifa', description: 'Mijoz bosh sahifasi' },
      },
      {
        path: 'xaridlar',
        element: <PortalPurchasesPage />,
        handle: { title: 'Xaridlar', description: 'Xaridlar tarixi' },
      },
      {
        path: 'xaridlar/:id',
        element: <PortalPurchaseDetailPage />,
        handle: { title: 'Xarid tafsilotlari', description: 'Xarid haqida batafsil' },
      },
      {
        path: 'qarzlar',
        element: <PortalDebtsPage />,
        handle: { title: 'Qarzlar', description: 'Mijoz qarzlari' },
      },
      {
        path: 'bildirishnomalar',
        element: <PortalNotificationsPage />,
        handle: { title: 'Bildirishnomalar', description: 'Xabarlar' },
      },
      {
        path: 'profil',
        element: <PortalProfilePage />,
        handle: { title: 'Profil', description: 'Shaxsiy ma\'lumotlar' },
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

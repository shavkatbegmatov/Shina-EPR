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
import { SettingsPage } from '../pages/settings/SettingsPage';

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
        element: (
          <PlaceholderPage
            title="Qarzlar"
            description="Qarzlar nazorati va qarzdorlar ro'yxati."
          />
        ),
        handle: { title: 'Qarzlar', description: 'Qarz va balans nazorati' },
      },
      {
        path: 'warehouse',
        element: (
          <PlaceholderPage
            title="Ombor"
            description="Zaxira kirim-chiqimi va partiya nazorati."
          />
        ),
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
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { LoginPage } from '../pages/auth/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { ProductsPage } from '../pages/products/ProductsPage';
import { CustomersPage } from '../pages/customers/CustomersPage';
import { POSPage } from '../pages/sales/POSPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'products',
        element: <ProductsPage />,
      },
      {
        path: 'pos',
        element: <POSPage />,
      },
      {
        path: 'sales',
        element: <div className="p-4"><h1 className="text-2xl font-bold">Sotuvlar</h1><p className="text-base-content/70">Tez orada...</p></div>,
      },
      {
        path: 'customers',
        element: <CustomersPage />,
      },
      {
        path: 'debts',
        element: <div className="p-4"><h1 className="text-2xl font-bold">Qarzlar</h1><p className="text-base-content/70">Tez orada...</p></div>,
      },
      {
        path: 'warehouse',
        element: <div className="p-4"><h1 className="text-2xl font-bold">Ombor</h1><p className="text-base-content/70">Tez orada...</p></div>,
      },
      {
        path: 'suppliers',
        element: <div className="p-4"><h1 className="text-2xl font-bold">Ta'minotchilar</h1><p className="text-base-content/70">Tez orada...</p></div>,
      },
      {
        path: 'reports',
        element: <div className="p-4"><h1 className="text-2xl font-bold">Hisobotlar</h1><p className="text-base-content/70">Tez orada...</p></div>,
      },
      {
        path: 'settings',
        element: <div className="p-4"><h1 className="text-2xl font-bold">Sozlamalar</h1><p className="text-base-content/70">Tez orada...</p></div>,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  CreditCard,
  Warehouse,
  TruckIcon,
  BarChart3,
  Settings,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import clsx from 'clsx';

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN', 'MANAGER', 'SELLER'] },
  { path: '/products', icon: Package, label: 'Mahsulotlar', roles: ['ADMIN', 'MANAGER', 'SELLER'] },
  { path: '/pos', icon: ShoppingCart, label: 'Kassa (POS)', roles: ['ADMIN', 'MANAGER', 'SELLER'] },
  { path: '/sales', icon: CreditCard, label: 'Sotuvlar', roles: ['ADMIN', 'MANAGER', 'SELLER'] },
  { path: '/customers', icon: Users, label: 'Mijozlar', roles: ['ADMIN', 'MANAGER', 'SELLER'] },
  { path: '/debts', icon: CreditCard, label: 'Qarzlar', roles: ['ADMIN', 'MANAGER', 'SELLER'] },
  { path: '/warehouse', icon: Warehouse, label: 'Ombor', roles: ['ADMIN', 'MANAGER'] },
  { path: '/suppliers', icon: TruckIcon, label: "Ta'minotchilar", roles: ['ADMIN', 'MANAGER'] },
  { path: '/reports', icon: BarChart3, label: 'Hisobotlar', roles: ['ADMIN', 'MANAGER'] },
  { path: '/settings', icon: Settings, label: 'Sozlamalar', roles: ['ADMIN'] },
];

export function Sidebar() {
  const { user } = useAuthStore();
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  const filteredItems = menuItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed top-0 left-0 z-50 h-screen w-64 bg-base-200 transition-transform lg:translate-x-0 lg:static',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h1 className="text-xl font-bold text-primary">Shina Magazin</h1>
          <button
            className="btn btn-ghost btn-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4">
          <ul className="menu menu-compact gap-1">
            {filteredItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                      isActive
                        ? 'bg-primary text-primary-content'
                        : 'hover:bg-base-300'
                    )
                  }
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}

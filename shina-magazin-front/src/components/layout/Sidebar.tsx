import type { CSSProperties } from 'react';
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
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          role="button"
          aria-label="Menyuni yopish"
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed left-0 top-0 z-50 flex h-screen w-72 flex-col bg-base-100/95 backdrop-blur transition-transform lg:sticky lg:translate-x-0',
          'border-r border-base-200 shadow-[var(--shadow-soft)]',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="relative overflow-hidden border-b border-base-200 px-4 py-2.5">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-secondary/10" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary shadow-sm">
                <span className="text-lg font-bold">S</span>
              </div>
              <div>
                <h1 className="text-lg font-bold">Shina Magazin</h1>
                <p className="text-xs text-base-content/60">
                  ERP boshqaruv paneli
                </p>
              </div>
            </div>
            <button
              className="btn btn-ghost btn-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Yopish"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4" aria-label="Asosiy navigatsiya">
          <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-[0.2em] text-base-content/40">
            Navigatsiya
          </p>
          <ul className="stagger-children flex flex-col gap-1">
            {filteredItems.map((item, index) => (
              <li
                key={item.path}
                style={{ '--i': index } as CSSProperties}
              >
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    clsx(
                      'group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition',
                      isActive
                        ? 'border-base-300 bg-base-200 text-base-content shadow-sm'
                        : 'border-transparent text-base-content/70 hover:border-base-300 hover:bg-base-200/70 hover:text-base-content'
                    )
                  }
                  onClick={() => setSidebarOpen(false)}
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={clsx(
                          'grid h-9 w-9 place-items-center rounded-lg transition',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'bg-base-200/70 text-base-content/50 group-hover:text-primary'
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                      </span>
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}

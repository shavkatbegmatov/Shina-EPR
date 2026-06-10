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
  ShoppingBag,
  BarChart3,
  Bell,
  Settings,
  X,
  UserCog,
  Shield,
  FileText,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { PermissionCode } from '../../hooks/usePermission';
import { Logo } from '../brand/Logo';
import { Button } from '@/ui';
import clsx from 'clsx';

// Menu items with permission-based visibility (labelKey -> i18n)
const menuItems = [
  { path: '/', icon: LayoutDashboard, labelKey: 'erp.nav.dashboard', permission: PermissionCode.DASHBOARD_VIEW },
  { path: '/products', icon: Package, labelKey: 'erp.nav.products', permission: PermissionCode.PRODUCTS_VIEW },
  { path: '/pos', icon: ShoppingCart, labelKey: 'erp.nav.pos', permission: PermissionCode.SALES_CREATE },
  { path: '/sales', icon: CreditCard, labelKey: 'erp.nav.sales', permission: PermissionCode.SALES_VIEW },
  { path: '/customers', icon: Users, labelKey: 'erp.nav.customers', permission: PermissionCode.CUSTOMERS_VIEW },
  { path: '/debts', icon: CreditCard, labelKey: 'erp.nav.debts', permission: PermissionCode.DEBTS_VIEW },
  { path: '/warehouse', icon: Warehouse, labelKey: 'erp.nav.warehouse', permission: PermissionCode.WAREHOUSE_VIEW },
  { path: '/suppliers', icon: TruckIcon, labelKey: 'erp.nav.suppliers', permission: PermissionCode.SUPPLIERS_VIEW },
  { path: '/purchases', icon: ShoppingBag, labelKey: 'erp.nav.purchases', permission: PermissionCode.PURCHASES_VIEW },
  { path: '/reports', icon: BarChart3, labelKey: 'erp.nav.reports', permission: PermissionCode.REPORTS_VIEW_SALES },
  { path: '/notifications', icon: Bell, labelKey: 'erp.nav.notifications', permission: PermissionCode.NOTIFICATIONS_VIEW },
  { path: '/employees', icon: UserCog, labelKey: 'erp.nav.employees', permission: PermissionCode.EMPLOYEES_VIEW },
  { path: '/roles', icon: Shield, labelKey: 'erp.nav.roles', permission: PermissionCode.ROLES_VIEW },
  { path: '/audit-logs', icon: FileText, labelKey: 'erp.nav.auditLogs', permission: PermissionCode.SETTINGS_VIEW },
  { path: '/settings', icon: Settings, labelKey: 'erp.nav.settings', permission: PermissionCode.SETTINGS_VIEW },
];

export function Sidebar() {
  const { t } = useTranslation();
  // Use Zustand selector to subscribe to permissions specifically
  const permissions = useAuthStore((state) => state.permissions);
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  const filteredItems = menuItems.filter(
    (item) => permissions.has(item.permission)
  );

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
          role="button"
          aria-label="Menyuni yopish"
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed left-0 top-0 z-50 flex h-screen w-72 flex-col bg-base-100/95 backdrop-blur transition-[transform,width] md:sticky md:w-16 md:translate-x-0 lg:w-72',
          'border-r border-base-200 shadow-[var(--shadow-soft)]',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="relative flex h-16 items-center justify-between overflow-hidden border-b border-base-200 px-4 md:px-2 lg:px-4">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-secondary/10" />
          <div className="relative flex items-center gap-3 md:justify-center lg:justify-start">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary shadow-sm">
              <Logo variant="mark" tone="erp" className="h-6 w-6" />
            </div>
            <div className="md:hidden lg:block">
              <h1 className="text-base font-bold leading-tight">Protektor</h1>
              <p className="text-[11px] text-base-content/60">
                ERP boshqaruv paneli
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="relative md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Yopish"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 md:p-2 lg:p-4 scrollbar-thin" aria-label="Asosiy navigatsiya">
          <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-[0.2em] text-base-content/40 md:hidden lg:block">
            Navigatsiya
          </p>
          <ul className="stagger-children flex flex-col gap-1 pb-4">
            {filteredItems.map((item, index) => (
              <li
                key={item.path}
                style={{ '--i': index } as CSSProperties}
              >
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  title={t(item.labelKey)}
                  className={({ isActive }) =>
                    clsx(
                      'group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition md:justify-center md:px-0 lg:justify-start lg:px-3',
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
                      <span className="md:hidden lg:inline">{t(item.labelKey)}</span>
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

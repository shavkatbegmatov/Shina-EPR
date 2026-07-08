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
  ClipboardList,
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
  { path: '/admin', icon: LayoutDashboard, labelKey: 'erp.nav.dashboard', permission: PermissionCode.DASHBOARD_VIEW },
  { path: '/admin/products', icon: Package, labelKey: 'erp.nav.products', permission: PermissionCode.PRODUCTS_VIEW },
  { path: '/admin/pos', icon: ShoppingCart, labelKey: 'erp.nav.pos', permission: PermissionCode.SALES_CREATE },
  { path: '/admin/sales', icon: CreditCard, labelKey: 'erp.nav.sales', permission: PermissionCode.SALES_VIEW },
  { path: '/admin/shop-orders', icon: ClipboardList, labelKey: 'erp.nav.shopOrders', permission: PermissionCode.SALES_VIEW },
  { path: '/admin/customers', icon: Users, labelKey: 'erp.nav.customers', permission: PermissionCode.CUSTOMERS_VIEW },
  { path: '/admin/debts', icon: CreditCard, labelKey: 'erp.nav.debts', permission: PermissionCode.DEBTS_VIEW },
  { path: '/admin/warehouse', icon: Warehouse, labelKey: 'erp.nav.warehouse', permission: PermissionCode.WAREHOUSE_VIEW },
  { path: '/admin/suppliers', icon: TruckIcon, labelKey: 'erp.nav.suppliers', permission: PermissionCode.SUPPLIERS_VIEW },
  { path: '/admin/purchases', icon: ShoppingBag, labelKey: 'erp.nav.purchases', permission: PermissionCode.PURCHASES_VIEW },
  { path: '/admin/reports', icon: BarChart3, labelKey: 'erp.nav.reports', permission: PermissionCode.REPORTS_VIEW_SALES },
  { path: '/admin/notifications', icon: Bell, labelKey: 'erp.nav.notifications', permission: PermissionCode.NOTIFICATIONS_VIEW },
  { path: '/admin/employees', icon: UserCog, labelKey: 'erp.nav.employees', permission: PermissionCode.EMPLOYEES_VIEW },
  { path: '/admin/roles', icon: Shield, labelKey: 'erp.nav.roles', permission: PermissionCode.ROLES_VIEW },
  { path: '/admin/audit-logs', icon: FileText, labelKey: 'erp.nav.auditLogs', permission: PermissionCode.SETTINGS_VIEW },
  { path: '/admin/settings', icon: Settings, labelKey: 'erp.nav.settings', permission: PermissionCode.SETTINGS_VIEW },
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

      {/* Sidebar — "cockpit": ikkala temada ham tungi-asfalt panel.
          data-theme="shina-dark" nested scope DaisyUI tokenlarini qorong'i
          variantga almashtiradi, shuning uchun ichidagi barcha semantik
          klasslar (bg-base-*, text-primary...) avtomatik moslashadi. */}
      <aside
        data-theme="shina-dark"
        className={clsx(
          'fixed left-0 top-0 z-50 flex h-screen w-72 flex-col bg-base-100 text-base-content transition-[transform,width] md:sticky md:w-16 md:translate-x-0 lg:w-72',
          'border-r border-base-300/40 shadow-[var(--shadow-strong)]',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Fara glow — panel tepasidagi kobalt nur (DaisyUI v4 oklch tokenlari) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,oklch(var(--p)/0.18),transparent_65%)]" />
        <div className="relative flex h-16 items-center justify-between overflow-hidden border-b border-base-300/40 px-4 md:px-2 lg:px-4">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/10" />
          <div className="relative flex items-center gap-3 md:justify-center lg:justify-start">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/20 text-primary shadow-[var(--glow-primary)] ring-1 ring-primary/30">
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
                  end={item.path === '/admin'}
                  title={t(item.labelKey)}
                  className={({ isActive }) =>
                    clsx(
                      'group relative flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition md:justify-center md:px-0 lg:justify-start lg:px-3',
                      isActive
                        ? 'border-primary/25 bg-primary/10 text-base-content shadow-[var(--glow-primary)]'
                        : 'border-transparent text-base-content/60 hover:border-base-300/50 hover:bg-base-200/70 hover:text-base-content'
                    )
                  }
                  onClick={() => setSidebarOpen(false)}
                >
                  {({ isActive }) => (
                    <>
                      {/* Aktiv indikator — chap "yo'l chizig'i" */}
                      {isActive && (
                        <span className="absolute -left-px top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-gradient-to-b from-primary to-accent md:hidden lg:block" />
                      )}
                      <span
                        className={clsx(
                          'grid h-9 w-9 place-items-center rounded-lg transition',
                          isActive
                            ? 'bg-primary text-primary-content shadow-sm'
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

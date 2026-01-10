import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { Home, ShoppingBag, CreditCard, Bell, User } from 'lucide-react';
import clsx from 'clsx';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  labelKey: string;
}

const navItems: NavItem[] = [
  { path: '/kabinet', icon: <Home size={22} />, labelKey: 'nav.home' },
  { path: '/kabinet/xaridlar', icon: <ShoppingBag size={22} />, labelKey: 'nav.purchases' },
  { path: '/kabinet/qarzlar', icon: <CreditCard size={22} />, labelKey: 'nav.debts' },
  { path: '/kabinet/bildirishnomalar', icon: <Bell size={22} />, labelKey: 'nav.notifications' },
  { path: '/kabinet/profil', icon: <User size={22} />, labelKey: 'nav.profile' },
];

interface BottomNavProps {
  unreadCount?: number;
}

export default function BottomNav({ unreadCount = 0 }: BottomNavProps) {
  const { t } = useTranslation();

  return (
    <nav className="btm-nav btm-nav-sm bg-base-100 border-t border-base-300 z-50">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/kabinet'}
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center justify-center gap-0.5 transition-colors',
              isActive ? 'active text-primary' : 'text-base-content/60'
            )
          }
        >
          <div className="relative">
            {item.icon}
            {item.labelKey === 'nav.notifications' && unreadCount > 0 && (
              <span className="absolute -top-1 -right-2 badge badge-primary badge-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
}

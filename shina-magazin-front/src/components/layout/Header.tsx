import { useState, useRef, useEffect } from 'react';
import {
  Menu,
  LogOut,
  User as UserIcon,
  Bell,
  Search,
  Settings,
  ChevronDown,
  Sun,
  Moon,
  HelpCircle,
  Shield,
} from 'lucide-react';
import { useMatches, useNavigate, Link } from 'react-router-dom';
import clsx from 'clsx';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { ROLES } from '../../config/constants';

type RouteHandle = {
  title?: string;
  description?: string;
};

export function Header() {
  const { user, logout } = useAuthStore();
  const { toggleSidebar } = useUIStore();
  const navigate = useNavigate();
  const matches = useMatches();
  const [searchFocused, setSearchFocused] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setNotifDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeMatch = [...matches]
    .reverse()
    .find((match) => (match.handle as RouteHandle | undefined)?.title);
  const title =
    (activeMatch?.handle as RouteHandle | undefined)?.title || 'Dashboard';
  const description = (activeMatch?.handle as RouteHandle | undefined)
    ?.description;

  const userInitial =
    user?.fullName?.charAt(0)?.toUpperCase() ||
    user?.username?.charAt(0)?.toUpperCase() ||
    '?';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    // Theme toggle logic can be implemented here
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-error/10 text-error border-error/20';
      case 'MANAGER':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'SELLER':
        return 'bg-info/10 text-info border-info/20';
      default:
        return 'bg-base-200 text-base-content/70 border-base-300';
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-base-200/80 bg-base-100/95 backdrop-blur-md">
      <div className="flex w-full items-center gap-3 px-4 py-2.5 lg:px-6">
        {/* Left section - Menu & Title */}
        <div className="flex items-center gap-3">
          <button
            className="btn btn-square btn-ghost btn-sm lg:hidden"
            onClick={toggleSidebar}
            aria-label="Menyu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Page title with breadcrumb style */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-sm text-base-content/50">
              <Link to="/" className="hover:text-primary transition-colors">
                Bosh sahifa
              </Link>
              <span>/</span>
            </div>
            <h1 className="text-base font-semibold text-base-content lg:text-lg">
              {title}
            </h1>
          </div>
        </div>

        {/* Center section - Search */}
        <div className="hidden md:flex flex-1 justify-center max-w-xl mx-4">
          <div
            className={clsx(
              'relative w-full transition-all duration-200',
              searchFocused ? 'scale-[1.02]' : ''
            )}
          >
            <Search
              className={clsx(
                'absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors',
                searchFocused ? 'text-primary' : 'text-base-content/40'
              )}
            />
            <input
              type="text"
              placeholder="Qidirish... (Ctrl+K)"
              className={clsx(
                'input input-sm w-full pl-9 pr-4 bg-base-200/50 border-base-200 transition-all duration-200',
                'placeholder:text-base-content/40 focus:bg-base-100 focus:border-primary/30',
                'focus:shadow-[0_0_0_3px_rgba(var(--p),0.1)]'
              )}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-base-content/40 bg-base-300/50 rounded">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right section - Actions & User */}
        <div className="ml-auto flex items-center gap-1">
          {/* Mobile search button */}
          <button className="btn btn-ghost btn-sm btn-square md:hidden">
            <Search className="h-4 w-4" />
          </button>

          {/* Theme toggle */}
          <button
            className="btn btn-ghost btn-sm btn-square hidden sm:flex"
            onClick={toggleTheme}
            title={isDark ? "Yorug' rejim" : "Qorong'i rejim"}
          >
            {isDark ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          {/* Help */}
          <button
            className="btn btn-ghost btn-sm btn-square hidden lg:flex"
            title="Yordam"
          >
            <HelpCircle className="h-4 w-4" />
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifDropdownRef}>
            <button
              className="btn btn-ghost btn-sm btn-square relative"
              title="Bildirishnomalar"
              onClick={() => {
                setNotifDropdownOpen(!notifDropdownOpen);
                setUserDropdownOpen(false);
              }}
            >
              <Bell className="h-4 w-4" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white">
                3
              </span>
            </button>
            <div
              className={clsx(
                "absolute right-0 z-50 mt-3 w-80 rounded-xl bg-base-100 p-0 shadow-xl border border-base-200 transition-all duration-200 origin-top-right",
                notifDropdownOpen
                  ? "opacity-100 scale-100 visible"
                  : "opacity-0 scale-95 invisible"
              )}
            >
              <div className="flex items-center justify-between border-b border-base-200 px-4 py-3">
                <span className="font-semibold">Bildirishnomalar</span>
                <span className="badge badge-error badge-sm">3 ta yangi</span>
              </div>
              <div className="max-h-72 overflow-y-auto">
                <div className="px-4 py-3 hover:bg-base-200/50 cursor-pointer transition-colors border-l-2 border-primary">
                  <p className="text-sm font-medium">Yangi buyurtma</p>
                  <p className="text-xs text-base-content/60 mt-0.5">
                    #INV-2024-001 buyurtmasi yaratildi
                  </p>
                  <p className="text-xs text-base-content/40 mt-1">2 daqiqa oldin</p>
                </div>
                <div className="px-4 py-3 hover:bg-base-200/50 cursor-pointer transition-colors border-l-2 border-warning">
                  <p className="text-sm font-medium">Kam zaxira ogohlantirishi</p>
                  <p className="text-xs text-base-content/60 mt-0.5">
                    5 ta mahsulot kam zaxirada
                  </p>
                  <p className="text-xs text-base-content/40 mt-1">1 soat oldin</p>
                </div>
                <div className="px-4 py-3 hover:bg-base-200/50 cursor-pointer transition-colors border-l-2 border-success">
                  <p className="text-sm font-medium">To'lov qabul qilindi</p>
                  <p className="text-xs text-base-content/60 mt-0.5">
                    Mijoz Alisher 500,000 so'm to'ladi
                  </p>
                  <p className="text-xs text-base-content/40 mt-1">3 soat oldin</p>
                </div>
              </div>
              <div className="border-t border-base-200 p-2">
                <button className="btn btn-ghost btn-sm w-full">
                  Barchasini ko'rish
                </button>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden sm:block h-6 w-px bg-base-200 mx-1" />

          {/* User dropdown */}
          <div className="relative" ref={userDropdownRef}>
            <button
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-base-200/70"
              onClick={() => {
                setUserDropdownOpen(!userDropdownOpen);
                setNotifDropdownOpen(false);
              }}
            >
              <div className="avatar placeholder">
                <div
                  className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    'bg-gradient-to-br from-primary/20 to-secondary/20 text-primary',
                    'ring-2 ring-primary/20'
                  )}
                >
                  <span className="text-sm font-semibold">{userInitial}</span>
                </div>
              </div>
              <div className="hidden lg:block text-left max-w-[120px]">
                <div className="text-sm font-medium truncate">{user?.fullName}</div>
                <div className="text-[10px] text-base-content/50 uppercase tracking-wider">
                  {user?.role && ROLES[user.role]?.label}
                </div>
              </div>
              <ChevronDown className={clsx(
                "h-3.5 w-3.5 text-base-content/50 hidden lg:block transition-transform duration-200",
                userDropdownOpen && "rotate-180"
              )} />
            </button>

            <div
              className={clsx(
                "absolute right-0 z-50 mt-3 w-64 rounded-xl bg-base-100 p-0 shadow-xl border border-base-200 transition-all duration-200 origin-top-right",
                userDropdownOpen
                  ? "opacity-100 scale-100 visible"
                  : "opacity-0 scale-95 invisible"
              )}
            >
              {/* User info header */}
              <div className="p-4 border-b border-base-200 bg-base-200/30 rounded-t-xl">
                <div className="flex items-center gap-3">
                  <div
                    className={clsx(
                      'w-12 h-12 rounded-full flex items-center justify-center',
                      'bg-gradient-to-br from-primary/20 to-secondary/20 text-primary',
                      'ring-2 ring-primary/20'
                    )}
                  >
                    <span className="text-lg font-semibold">{userInitial}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{user?.fullName}</p>
                    <p className="text-xs text-base-content/60 truncate">
                      {user?.username}
                    </p>
                    <div
                      className={clsx(
                        'inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium border',
                        getRoleBadgeColor(user?.role)
                      )}
                    >
                      <Shield className="h-2.5 w-2.5" />
                      {user?.role && ROLES[user.role]?.label}
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div className="p-2">
                <button
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-base-200/70"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <UserIcon className="h-4 w-4 text-base-content/60" />
                  <span>Profil sozlamalari</span>
                </button>
                <Link
                  to="/settings"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-base-200/70"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <Settings className="h-4 w-4 text-base-content/60" />
                  <span>Tizim sozlamalari</span>
                </Link>
                <button
                  className="flex sm:hidden w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-base-200/70"
                  onClick={() => {
                    toggleTheme();
                    setUserDropdownOpen(false);
                  }}
                >
                  {isDark ? (
                    <Sun className="h-4 w-4 text-base-content/60" />
                  ) : (
                    <Moon className="h-4 w-4 text-base-content/60" />
                  )}
                  <span>{isDark ? "Yorug' rejim" : "Qorong'i rejim"}</span>
                </button>
              </div>

              {/* Logout */}
              <div className="p-2 border-t border-base-200">
                <button
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-error transition-colors hover:bg-error/10"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    handleLogout();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Chiqish</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Optional: Description bar */}
      {description && (
        <div className="border-t border-base-200/50 bg-base-200/30 px-4 py-1.5 lg:px-6">
          <p className="text-xs text-base-content/60">{description}</p>
        </div>
      )}
    </header>
  );
}

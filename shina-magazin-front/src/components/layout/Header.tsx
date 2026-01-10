import { Menu, LogOut, User as UserIcon } from 'lucide-react';
import { useMatches, useNavigate } from 'react-router-dom';
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
  const activeMatch = [...matches]
    .reverse()
    .find((match) => (match.handle as RouteHandle | undefined)?.title);
  const title =
    (activeMatch?.handle as RouteHandle | undefined)?.title || 'Shina Magazin';
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

  return (
    <header className="sticky top-0 z-30 border-b border-base-200 bg-base-100/80 shadow-sm backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-4 px-4 py-3 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            className="btn btn-square btn-ghost lg:hidden"
            onClick={toggleSidebar}
            aria-label="Menyu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="hidden lg:flex flex-col">
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold">{title}</span>
              {user?.role && (
                <span className="pill">{ROLES[user.role]?.label}</span>
              )}
            </div>
            {description && (
              <span className="text-xs text-base-content/60">
                {description}
              </span>
            )}
          </div>
          <div className="flex flex-col lg:hidden">
            <span className="text-base font-semibold">{title}</span>
            {description && (
              <span className="text-xs text-base-content/60">
                {description}
              </span>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="dropdown dropdown-end">
            <div
              tabIndex={0}
              role="button"
              className="btn btn-ghost gap-2"
            >
              <div className="avatar placeholder">
                <div className="w-9 rounded-full bg-primary/15 text-primary">
                  <span className="text-sm font-semibold">{userInitial}</span>
                </div>
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-medium">{user?.fullName}</div>
                <div className="text-xs text-base-content/70">
                  {user?.role && ROLES[user.role]?.label}
                </div>
              </div>
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content menu menu-sm z-[1] mt-3 w-56 rounded-box bg-base-100 p-2 shadow-[var(--shadow-soft)]"
            >
              <li>
                <button type="button" className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  Profil
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="flex items-center gap-2 text-error"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Chiqish
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </header>
  );
}

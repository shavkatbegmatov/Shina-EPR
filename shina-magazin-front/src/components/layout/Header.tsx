import { Menu, LogOut, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { ROLES } from '../../config/constants';

export function Header() {
  const { user, logout } = useAuthStore();
  const { toggleSidebar } = useUIStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar bg-base-100 shadow-sm border-b border-base-200 sticky top-0 z-30">
      <div className="flex-none lg:hidden">
        <button
          className="btn btn-square btn-ghost"
          onClick={toggleSidebar}
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1">
        <span className="text-lg font-semibold lg:hidden">Shina Magazin</span>
      </div>

      <div className="flex-none gap-2">
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className="btn btn-ghost gap-2"
          >
            <div className="avatar placeholder">
              <div className="bg-primary text-primary-content rounded-full w-8">
                <span className="text-sm">
                  {user?.fullName?.charAt(0).toUpperCase()}
                </span>
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
            className="dropdown-content menu menu-sm z-[1] mt-3 w-52 p-2 shadow bg-base-100 rounded-box"
          >
            <li>
              <a className="flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                Profil
              </a>
            </li>
            <li>
              <a
                className="flex items-center gap-2 text-error"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                Chiqish
              </a>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}

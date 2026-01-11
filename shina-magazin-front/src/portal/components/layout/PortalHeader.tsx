import { useTranslation } from 'react-i18next';
import { ArrowLeft, Globe, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePortalAuthStore } from '../../store/portalAuthStore';
import { portalApiClient } from '../../api/portal.api';

interface PortalHeaderProps {
  title: string;
  showBack?: boolean;
  showLanguage?: boolean;
  showTheme?: boolean;
}

export default function PortalHeader({
  title,
  showBack = false,
  showLanguage = true,
  showTheme = true,
}: PortalHeaderProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { language, setLanguage, theme, setTheme } = usePortalAuthStore();

  const toggleLanguage = async () => {
    const newLang = language === 'uz' ? 'ru' : 'uz';
    try {
      await portalApiClient.updateLanguage(newLang);
      setLanguage(newLang);
      i18n.changeLanguage(newLang);
    } catch (error) {
      console.error('Failed to update language', error);
      // Still update locally
      setLanguage(newLang);
      i18n.changeLanguage(newLang);
    }
  };

  const toggleTheme = () => {
    // Cycle through: light -> dark -> system -> light
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getThemeIcon = () => {
    if (theme === 'dark') {
      return <Moon size={18} />;
    }
    if (theme === 'light') {
      return <Sun size={18} />;
    }
    // System theme - show based on actual preference
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDark ? <Moon size={18} className="opacity-60" /> : <Sun size={18} className="opacity-60" />;
  };

  return (
    <header className="navbar bg-primary text-primary-content sticky top-0 z-40 px-2">
      <div className="navbar-start">
        {showBack && (
          <button
            className="btn btn-ghost btn-circle btn-sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={20} />
          </button>
        )}
      </div>
      <div className="navbar-center">
        <h1 className="text-lg font-bold">{title}</h1>
      </div>
      <div className="navbar-end gap-1">
        {showTheme && (
          <button
            className="btn btn-ghost btn-circle btn-sm"
            onClick={toggleTheme}
            title={t('profile.changeTheme')}
          >
            {getThemeIcon()}
          </button>
        )}
        {showLanguage && (
          <button
            className="btn btn-ghost btn-circle btn-sm"
            onClick={toggleLanguage}
            title={t('profile.changeLanguage')}
          >
            <div className="flex items-center gap-1">
              <Globe size={18} />
              <span className="text-xs uppercase font-semibold">{language}</span>
            </div>
          </button>
        )}
      </div>
    </header>
  );
}

import { useTranslation } from 'react-i18next';
import { ArrowLeft, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePortalAuthStore } from '../../store/portalAuthStore';
import { portalApiClient } from '../../api/portal.api';

interface PortalHeaderProps {
  title: string;
  showBack?: boolean;
  showLanguage?: boolean;
}

export default function PortalHeader({ title, showBack = false, showLanguage = true }: PortalHeaderProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { language, setLanguage } = usePortalAuthStore();

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
      <div className="navbar-end">
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

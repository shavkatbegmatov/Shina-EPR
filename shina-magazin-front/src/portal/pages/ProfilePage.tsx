import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Phone, MapPin, Building, Calendar, Globe, LogOut, Sun, Moon, Monitor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { portalApiClient } from '../api/portal.api';
import { portalAuthApi } from '../api/portalAuth.api';
import { usePortalAuthStore, type ThemeMode } from '../store/portalAuthStore';
import PortalHeader from '../components/layout/PortalHeader';
import type { CustomerPortalProfile } from '../types/portal.types';
import { format } from 'date-fns';

export default function PortalProfilePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { logout, language, setLanguage, theme, setTheme } = usePortalAuthStore();
  const [profile, setProfile] = useState<CustomerPortalProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalApiClient.getProfile()
      .then(setProfile)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleLanguageChange = async (lang: string) => {
    try {
      await portalApiClient.updateLanguage(lang);
      setLanguage(lang);
      i18n.changeLanguage(lang);
      toast.success(t('profile.language') + ': ' + (lang === 'uz' ? "O'zbekcha" : 'Русский'));
    } catch (error) {
      console.error('Failed to update language', error);
    }
  };

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    toast.success(t('profile.theme') + ': ' + t(`profile.theme${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)}`));
  };

  const handleLogout = async () => {
    try {
      await portalAuthApi.logout();
    } catch {
      // Ignore
    }
    logout();
    navigate('/kabinet/kirish');
    toast.success(t('auth.logout'));
  };

  if (loading) {
    return (
      <div className="flex flex-col">
        <PortalHeader title={t('profile.title')} showLanguage={false} />
        <div className="flex items-center justify-center h-64">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PortalHeader title={t('profile.title')} showLanguage={false} />

      <div className="p-4 space-y-4">
        {/* Profile Header */}
        <div className="card bg-primary text-primary-content">
          <div className="card-body p-4 items-center text-center">
            <div className="avatar placeholder mb-2">
              <div className="bg-primary-content text-primary rounded-full w-16">
                <span className="text-2xl">{profile?.fullName?.charAt(0) || 'M'}</span>
              </div>
            </div>
            <h2 className="text-xl font-bold">{profile?.fullName}</h2>
            <p className="opacity-80">{profile?.phone}</p>
          </div>
        </div>

        {/* Personal Info */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <User size={18} />
              {t('profile.personalInfo')}
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="text-base-content/40" size={18} />
                <div>
                  <p className="text-xs text-base-content/60">{t('profile.phone')}</p>
                  <p className="font-medium">{profile?.phone}</p>
                </div>
              </div>

              {profile?.phone2 && (
                <div className="flex items-center gap-3">
                  <Phone className="text-base-content/40" size={18} />
                  <div>
                    <p className="text-xs text-base-content/60">{t('profile.phone2')}</p>
                    <p className="font-medium">{profile.phone2}</p>
                  </div>
                </div>
              )}

              {profile?.address && (
                <div className="flex items-center gap-3">
                  <MapPin className="text-base-content/40" size={18} />
                  <div>
                    <p className="text-xs text-base-content/60">{t('profile.address')}</p>
                    <p className="font-medium">{profile.address}</p>
                  </div>
                </div>
              )}

              {profile?.companyName && (
                <div className="flex items-center gap-3">
                  <Building className="text-base-content/40" size={18} />
                  <div>
                    <p className="text-xs text-base-content/60">{t('profile.company')}</p>
                    <p className="font-medium">{profile.companyName}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Calendar className="text-base-content/40" size={18} />
                <div>
                  <p className="text-xs text-base-content/60">{t('profile.memberSince')}</p>
                  <p className="font-medium">
                    {profile?.createdAt ? format(new Date(profile.createdAt), 'dd.MM.yyyy') : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Language Settings */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Globe size={18} />
              {t('profile.language')}
            </h3>
            <div className="flex gap-2">
              <button
                className={`btn btn-sm flex-1 ${language === 'uz' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => handleLanguageChange('uz')}
              >
                O'zbekcha
              </button>
              <button
                className={`btn btn-sm flex-1 ${language === 'ru' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => handleLanguageChange('ru')}
              >
                Русский
              </button>
            </div>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Sun size={18} />
              {t('profile.theme')}
            </h3>
            <div className="flex gap-2">
              <button
                className={`btn btn-sm flex-1 gap-1 ${theme === 'light' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => handleThemeChange('light')}
              >
                <Sun size={16} />
                {t('profile.themeLight')}
              </button>
              <button
                className={`btn btn-sm flex-1 gap-1 ${theme === 'dark' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => handleThemeChange('dark')}
              >
                <Moon size={16} />
                {t('profile.themeDark')}
              </button>
              <button
                className={`btn btn-sm flex-1 gap-1 ${theme === 'system' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => handleThemeChange('system')}
              >
                <Monitor size={16} />
                {t('profile.themeSystem')}
              </button>
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          className="btn btn-error btn-outline w-full"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          {t('auth.logout')}
        </button>
      </div>
    </div>
  );
}

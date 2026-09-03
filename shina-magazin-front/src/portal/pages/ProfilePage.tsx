import { switchLanguage } from '@/i18n';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Phone, MapPin, Building, Calendar, Globe, LogOut, Sun, Moon, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { portalApiClient } from '../api/portal.api';
import { portalKeys } from '../api/portalQueryKeys';
import { portalAuthApi } from '../api/portalAuth.api';
import { usePortalAuthStore } from '../store/portalAuthStore';
import { useThemeStore, type ThemeMode } from '../../shared/theme/themeStore';
import PortalHeader from '../components/layout/PortalHeader';
import { PortalError, PortalLoading } from '../components/PortalState';
import { getApiErrorMessage } from '../../utils/apiError';
import { Button } from '@/ui';

const MINUTE = 60 * 1000;

export default function PortalProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logout, language, setLanguage } = usePortalAuthStore();
  const { mode: theme, setMode: setTheme } = useThemeStore();

  const profileQuery = useQuery({
    queryKey: portalKeys.profile(),
    queryFn: () => portalApiClient.getProfile(),
    staleTime: 10 * MINUTE, // profil kamdan-kam o'zgaradi
  });

  const languageMutation = useMutation({
    mutationFn: (lang: string) => portalApiClient.updateLanguage(lang),
    onSuccess: (_profile, lang) => {
      setLanguage(lang);
      void switchLanguage(lang);
      void queryClient.invalidateQueries({ queryKey: portalKeys.profile() });
      toast.success(t('profile.language') + ': ' + (lang === 'uz' ? "O'zbekcha" : 'Русский'));
    },
    // Ilgari xato faqat console'ga yozilardi — foydalanuvchi tugma bosib hech narsa ko'rmasdi
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

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
    queryClient.removeQueries({ queryKey: portalKeys.all });
    navigate('/');
    toast.success(t('auth.logout'));
  };

  if (profileQuery.isPending) {
    return (
      <div className="flex flex-col">
        <PortalHeader title={t('profile.title')} showLanguage={false} />
        <PortalLoading />
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <div className="flex flex-col">
        <PortalHeader title={t('profile.title')} showLanguage={false} />
        <PortalError message={getApiErrorMessage(profileQuery.error)} onRetry={() => void profileQuery.refetch()} />
      </div>
    );
  }

  const profile = profileQuery.data;

  return (
    <div className="flex flex-col">
      <PortalHeader title={t('profile.title')} showLanguage={false} />

      <div className="p-4 space-y-4">
        {/* Profile Header */}
        <div className="card bg-primary text-primary-content">
          <div className="card-body p-4 items-center text-center">
            <div className="avatar placeholder mb-2">
              <div className="bg-primary-content text-primary rounded-full w-16">
                <span className="text-2xl">{profile.fullName?.charAt(0) || 'M'}</span>
              </div>
            </div>
            <h2 className="text-xl font-bold">{profile.fullName}</h2>
            <p className="opacity-80">{profile.phone}</p>
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
                  <p className="font-medium">{profile.phone}</p>
                </div>
              </div>

              {profile.phone2 && (
                <div className="flex items-center gap-3">
                  <Phone className="text-base-content/40" size={18} />
                  <div>
                    <p className="text-xs text-base-content/60">{t('profile.phone2')}</p>
                    <p className="font-medium">{profile.phone2}</p>
                  </div>
                </div>
              )}

              {profile.address && (
                <div className="flex items-center gap-3">
                  <MapPin className="text-base-content/40" size={18} />
                  <div>
                    <p className="text-xs text-base-content/60">{t('profile.address')}</p>
                    <p className="font-medium">{profile.address}</p>
                  </div>
                </div>
              )}

              {profile.companyName && (
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
                    {profile.createdAt ? format(new Date(profile.createdAt), 'dd.MM.yyyy') : '-'}
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
              <Button
                size="sm"
                variant={language === 'uz' ? 'primary' : 'ghost'}
                className="flex-1"
                disabled={languageMutation.isPending}
                onClick={() => languageMutation.mutate('uz')}
              >
                O'zbekcha
              </Button>
              <Button
                size="sm"
                variant={language === 'ru' ? 'primary' : 'ghost'}
                className="flex-1"
                disabled={languageMutation.isPending}
                onClick={() => languageMutation.mutate('ru')}
              >
                Русский
              </Button>
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
              <Button
                size="sm"
                variant={theme === 'light' ? 'primary' : 'ghost'}
                className="flex-1 gap-1"
                onClick={() => handleThemeChange('light')}
              >
                <Sun size={16} />
                {t('profile.themeLight')}
              </Button>
              <Button
                size="sm"
                variant={theme === 'dark' ? 'primary' : 'ghost'}
                className="flex-1 gap-1"
                onClick={() => handleThemeChange('dark')}
              >
                <Moon size={16} />
                {t('profile.themeDark')}
              </Button>
              <Button
                size="sm"
                variant={theme === 'system' ? 'primary' : 'ghost'}
                className="flex-1 gap-1"
                onClick={() => handleThemeChange('system')}
              >
                <Monitor size={16} />
                {t('profile.themeSystem')}
              </Button>
            </div>
          </div>
        </div>

        {/* Logout */}
        <Button
          variant="danger"
          className="btn-outline w-full"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          {t('auth.logout')}
        </Button>
      </div>
    </div>
  );
}

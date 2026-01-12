import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate, Navigate } from 'react-router-dom';
import { LogIn, Lock, Globe, AlertCircle, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { portalAuthApi } from '../api/portalAuth.api';
import { usePortalAuthStore } from '../store/portalAuthStore';
import type { CustomerLoginRequest } from '../types/portal.types';

export default function PortalLoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, setAuth, language, setLanguage, theme, setTheme } = usePortalAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Apply theme on login page
  const getEffectiveTheme = useCallback(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'shina-dark' : 'shina';
    }
    return theme === 'dark' ? 'shina-dark' : 'shina';
  }, [theme]);

  useEffect(() => {
    const applyTheme = () => {
      document.documentElement.setAttribute('data-theme', getEffectiveTheme());
    };
    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') applyTheme();
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, getEffectiveTheme]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CustomerLoginRequest>({
    defaultValues: {
      phone: '',
      pin: '',
    },
  });

  const toggleLanguage = () => {
    const newLang = language === 'uz' ? 'ru' : 'uz';
    setLanguage(newLang);
    i18n.changeLanguage(newLang);
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const onSubmit = async (data: CustomerLoginRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await portalAuthApi.login(data);
      setAuth(response.customer, response.accessToken, response.refreshToken);
      i18n.changeLanguage(response.customer.preferredLanguage || 'uz');
      toast.success(t('auth.welcome'));
      navigate('/kabinet');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const message = error.response?.data?.message || t('auth.invalidCredentials');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return <Navigate to="/kabinet" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-focus flex flex-col items-center justify-center p-4 max-w-md mx-auto">
      {/* Top Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {/* Theme Toggle */}
        <button
          type="button"
          className="btn btn-ghost btn-circle text-primary-content"
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        {/* Language Toggle */}
        <button
          type="button"
          className="btn btn-ghost btn-circle text-primary-content"
          onClick={toggleLanguage}
        >
          <div className="flex items-center gap-1">
            <Globe size={20} />
            <span className="text-sm uppercase font-semibold">{language}</span>
          </div>
        </button>
      </div>

      {/* Logo/Brand */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-3xl">🚗</span>
        </div>
        <h1 className="text-2xl font-bold text-primary-content">Shina Magazin</h1>
        <p className="text-primary-content/80 mt-1">{t('auth.enterCredentials')}</p>
      </div>

      {/* Login Card */}
      <div className="card bg-base-100 shadow-xl w-full">
        <div className="card-body">
          <h2 className="card-title justify-center text-xl mb-4">
            <LogIn className="w-5 h-5" />
            {t('auth.login')}
          </h2>

          {error && (
            <div className="alert alert-error mb-4">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Phone Input */}
            <Controller
              name="phone"
              control={control}
              rules={{
                required: t('auth.phone') + ' kiritilishi shart',
                pattern: {
                  value: /^\+998[0-9]{9}$/,
                  message: t('auth.phonePlaceholder'),
                },
              }}
              render={({ field }) => (
                <PhoneInput
                  label={t('auth.phone')}
                  value={field.value || ''}
                  onChange={field.onChange}
                  error={errors.phone?.message}
                  required
                />
              )}
            />

            {/* PIN Input */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">{t('auth.pin')}</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/40" />
                <input
                  type="password"
                  {...register('pin', {
                    required: t('auth.pin') + ' kiritilishi shart',
                    minLength: {
                      value: 4,
                      message: 'PIN kod kamida 4 raqam',
                    },
                    maxLength: {
                      value: 6,
                      message: 'PIN kod ko\'pi bilan 6 raqam',
                    },
                  })}
                  className="input input-bordered w-full pl-10 tracking-widest"
                  placeholder={t('auth.pinPlaceholder')}
                  inputMode="numeric"
                  maxLength={6}
                />
              </div>
              {errors.pin && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.pin.message}</span>
                </label>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary w-full mt-6"
              disabled={loading}
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  {t('auth.loginButton')}
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <p className="text-primary-content/60 text-sm mt-8 text-center">
        © 2024 Shina Magazin. Barcha huquqlar himoyalangan.
      </p>
    </div>
  );
}

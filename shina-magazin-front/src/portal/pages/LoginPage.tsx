import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate, Navigate } from 'react-router-dom';
import { LogIn, Phone, Lock, Globe, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { portalAuthApi } from '../api/portalAuth.api';
import { usePortalAuthStore } from '../store/portalAuthStore';
import type { CustomerLoginRequest } from '../types/portal.types';

export default function PortalLoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, setAuth, language, setLanguage } = usePortalAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerLoginRequest>({
    defaultValues: {
      phone: '+998',
      pin: '',
    },
  });

  const toggleLanguage = () => {
    const newLang = language === 'uz' ? 'ru' : 'uz';
    setLanguage(newLang);
    i18n.changeLanguage(newLang);
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
      {/* Language Toggle */}
      <button
        type="button"
        className="absolute top-4 right-4 btn btn-ghost btn-circle text-primary-content"
        onClick={toggleLanguage}
      >
        <div className="flex items-center gap-1">
          <Globe size={20} />
          <span className="text-sm uppercase font-semibold">{language}</span>
        </div>
      </button>

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
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">{t('auth.phone')}</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/40" />
                <input
                  type="tel"
                  {...register('phone', {
                    required: t('auth.phone') + ' kiritilishi shart',
                    pattern: {
                      value: /^\+998[0-9]{9}$/,
                      message: t('auth.phonePlaceholder'),
                    },
                  })}
                  className="input input-bordered w-full pl-10"
                  placeholder={t('auth.phonePlaceholder')}
                  inputMode="tel"
                />
              </div>
              {errors.phone && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.phone.message}</span>
                </label>
              )}
            </div>

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

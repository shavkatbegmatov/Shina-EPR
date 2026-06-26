import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { LogIn, Lock, AlertCircle, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { portalAuthApi } from '../../portal/api/portalAuth.api';
import { usePortalAuthStore } from '../../portal/store/portalAuthStore';
import { Button } from '@/ui';
import type { CustomerLoginRequest } from '../../portal/types/portal.types';

/**
 * Storefront mijoz login sahifasi (`/kirish`). Portal telefon+PIN auth'ini QAYTA
 * ISHLATADI (bitta mijoz akkaunti). ShopLayout ichida (header/footer bilan) markaziy
 * karta — portalning to'liq-ekran gradient login'idan farqli. `?redirect=` qo'llanadi.
 */
export function ShopLoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/buyurtmalarim';
  const { isAuthenticated, setAuth } = usePortalAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CustomerLoginRequest>({ defaultValues: { phone: '', pin: '' } });

  const onSubmit = async (data: CustomerLoginRequest) => {
    setLoading(true);
    setError(null);
    try {
      const response = await portalAuthApi.login(data);
      setAuth(response.customer, response.accessToken, response.refreshToken);
      i18n.changeLanguage(response.customer.preferredLanguage || i18n.language);
      toast.success(t('auth.welcome'));
      navigate(redirect, { replace: true });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return <Navigate to={redirect} replace />;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-16">
      <div className="rounded-2xl border border-base-200 bg-base-100 p-6 shadow-xl sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <UserRound className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold">{t('shop.account.loginTitle')}</h1>
          <p className="mt-1 text-sm text-base-content/60">{t('shop.account.loginSubtitle')}</p>
        </div>

        {error && (
          <div className="alert alert-error mb-4">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="phone"
            control={control}
            rules={{
              required: true,
              pattern: { value: /^\+998[0-9]{9}$/, message: t('auth.phonePlaceholder') },
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

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">{t('auth.pin')}</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-base-content/40" />
              <input
                type="password"
                {...register('pin', { required: true, minLength: 4, maxLength: 6 })}
                className="input input-bordered w-full pl-10 tracking-widest"
                placeholder={t('auth.pinPlaceholder')}
                inputMode="numeric"
                maxLength={6}
              />
            </div>
          </div>

          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                {t('auth.loginButton')}
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

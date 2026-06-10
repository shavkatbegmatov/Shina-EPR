import { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  LogIn,
  Eye,
  EyeOff,
  ShieldCheck,
  Gauge,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Logo } from '../../components/brand/Logo';
import { Button } from '@/ui';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';
import type { LoginRequest } from '../../types';

export function LoginPage() {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth, isAuthenticated } = useAuthStore();

  const redirectTo = useMemo(() => {
    const from = (location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null)?.from;
    const path = from?.pathname ? `${from.pathname}${from.search || ''}${from.hash || ''}` : '/';
    if (path.startsWith('/login') || path.startsWith('/register')) {
      return '/';
    }
    return path;
  }, [location.state]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>();

  const onSubmit = async (data: LoginRequest) => {
    setLoading(true);
    try {
      const response = await authApi.login(data);

      // Update user object with mustChangePassword flag from response
      const userWithPasswordFlag = {
        ...response.user,
        mustChangePassword: response.requiresPasswordChange || false,
      };

      setAuth(
        userWithPasswordFlag,
        response.accessToken,
        response.refreshToken,
        response.permissions,
        response.roles
      );

      toast.success(t('erp.login.loginSuccess'));
      // Navigate to main app - modal will show automatically if mustChangePassword is true
      navigate(redirectTo, { replace: true });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || t('erp.login.loginError'));
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/15 via-base-100 to-secondary/15 p-4">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-base-200 bg-base-100/85 shadow-[var(--shadow-strong)] backdrop-blur lg:grid-cols-[1.1fr_1fr]">
          <div className="relative hidden flex-col justify-between bg-gradient-to-br from-primary/15 via-transparent to-secondary/10 p-10 lg:flex">
            <div>
              <div className="pill w-fit">{t('erp.login.platformBadge')}</div>
              <h1 className="mt-4 text-4xl font-semibold leading-tight">
                Protektor
                <span className="block text-base-content/60">
                  {t('erp.login.tagline')}
                </span>
              </h1>
              <p className="mt-4 text-sm text-base-content/60">
                {t('erp.login.intro')}
              </p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
                  <Gauge className="h-4 w-4" />
                </span>
                <span>{t('erp.login.feature1')}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary/15 text-secondary">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span>{t('erp.login.feature2')}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-success/15 text-success">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <span>{t('erp.login.feature3')}</span>
              </div>
            </div>
          </div>

          <div className="p-8 sm:p-10">
            <Logo variant="lockup" tone="erp" className="mb-6 lg:hidden" />
            <div className="mb-6">
              <h2 className="text-2xl font-semibold">{t('erp.login.title')}</h2>
              <p className="text-sm text-base-content/60">
                {t('erp.login.subtitle')}
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <label className="form-control">
                <span className="label-text text-sm">{t('erp.login.usernameLabel')}</span>
                <input
                  type="text"
                  placeholder="admin"
                  autoComplete="username"
                  className={`input input-bordered w-full ${errors.username ? 'input-error' : ''}`}
                  {...register('username', {
                    required: t('erp.login.usernameRequired'),
                  })}
                />
                {errors.username && (
                  <span className="mt-1 text-xs text-error">
                    {errors.username.message}
                  </span>
                )}
              </label>

              <label className="form-control">
                <span className="label-text text-sm">{t('erp.login.passwordLabel')}</span>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={`input input-bordered w-full pr-10 ${errors.password ? 'input-error' : ''}`}
                    {...register('password', {
                      required: t('erp.login.passwordRequired'),
                    })}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? t('erp.login.hidePassword') : t('erp.login.showPassword')}
                    aria-pressed={showPassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <span className="mt-1 text-xs text-error">
                    {errors.password.message}
                  </span>
                )}
              </label>

              <div className="flex items-center justify-between text-xs text-base-content/60">
                <label className="flex items-center gap-2 py-2">
                  <input type="checkbox" className="checkbox checkbox-xs" />
                  {t('erp.login.rememberMe')}
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-[44px]"
                  onClick={() =>
                    toast(t('erp.login.forgotPasswordHint'))
                  }
                >
                  {t('erp.login.forgotPassword')}
                </Button>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <span className="loading loading-spinner" />
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    {t('erp.login.signIn')}
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 surface-soft rounded-xl p-4 text-sm text-base-content/70">
              <p className="font-medium text-base-content">{t('erp.login.demoTitle')}</p>
              <p className="mt-2">
                {t('erp.login.demoAdmin')}:{' '}
                <code className="rounded bg-base-200 px-2 py-1">admin</code> /{' '}
                <code className="rounded bg-base-200 px-2 py-1">admin123</code>
              </p>
              <p className="mt-2">
                {t('erp.login.demoSeller')}:{' '}
                <code className="rounded bg-base-200 px-2 py-1">seller</code> /{' '}
                <code className="rounded bg-base-200 px-2 py-1">seller123</code>
              </p>
            </div>

            <div className="mt-4 text-center text-xs text-base-content/60">
              {t('erp.login.noAccount')}{' '}
              <Link to="/register" className="link link-primary">
                {t('erp.login.register')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

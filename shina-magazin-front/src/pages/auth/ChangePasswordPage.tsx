import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Key, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';
import type { ChangePasswordRequest } from '../../types';
import { Button } from '@/ui';
import { evaluatePassword } from '@/security/passwordPolicy';
import { GeneratePasswordButton } from '../../components/common/GeneratePasswordButton';
import { PasswordInput } from '../../components/common/PasswordInput';
import { PasswordStrengthMeter } from '../../components/common/PasswordStrengthMeter';

interface FormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function ChangePasswordPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>();

  const newPassword = watch('newPassword', '');
  const passwordIsValid = evaluatePassword(newPassword).isValid;

  const passwordValidationRule = (value: string) =>
    evaluatePassword(value).isValid || t('erp.passwordPolicy.requiredPolicy');

  const applyGeneratedPassword = (password: string) => {
    setValue('newPassword', password, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    setValue('confirmPassword', password, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  };

  const onSubmit = async (data: FormData) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error(t('erp.changePassword.toastMismatch'));
      return;
    }

    setLoading(true);
    try {
      const request: ChangePasswordRequest = {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      };

      await authApi.changePassword(request);
      toast.success(t('erp.changePassword.toastSuccess'));

      // Force re-login after password change
      logout();
      navigate('/admin/login');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || t('erp.changePassword.toastError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/15 via-base-100 to-secondary/15 p-4">
      <div className="mx-auto flex min-h-screen max-w-md items-center">
        <div className="w-full overflow-hidden rounded-3xl border border-base-200 bg-base-100/85 shadow-xl backdrop-blur p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-primary mb-4">
              <Key className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold">{t('erp.changePassword.title')}</h1>
            <p className="text-sm text-base-content/60 mt-2">
              {user?.username && (
                <span className="badge badge-outline badge-sm mr-2">{user.username}</span>
              )}
              {t('erp.changePassword.subtitle')}
            </p>
          </div>

          {/* Alert */}
          <div className="alert alert-warning mb-6">
            <ShieldCheck className="h-5 w-5" />
            <div>
              <p className="font-medium">{t('erp.changePassword.alertTitle')}</p>
              <p className="text-sm">{t('erp.changePassword.alertText')}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <PasswordInput
              label={t('erp.changePassword.currentPasswordLabel')}
              labelClassName="text-sm normal-case tracking-normal"
              placeholder={t('erp.changePassword.currentPasswordPlaceholder')}
              autoComplete="current-password"
              disabled={loading}
              error={errors.currentPassword?.message}
              {...register('currentPassword', {
                required: t('erp.changePassword.currentPasswordRequired'),
              })}
            />

            <PasswordInput
              label={t('erp.changePassword.newPasswordLabel')}
              labelClassName="text-sm normal-case tracking-normal"
              placeholder={t('erp.changePassword.newPasswordPlaceholder')}
              autoComplete="new-password"
              disabled={loading}
              error={errors.newPassword?.message}
              actions={<GeneratePasswordButton onGenerate={applyGeneratedPassword} disabled={loading} />}
              {...register('newPassword', {
                required: t('erp.changePassword.newPasswordRequired'),
                validate: passwordValidationRule,
              })}
            />

            <PasswordStrengthMeter password={newPassword} className="bg-base-200/40" />

            <PasswordInput
              label={t('erp.changePassword.confirmPasswordLabel')}
              labelClassName="text-sm normal-case tracking-normal"
              placeholder={t('erp.changePassword.confirmPasswordPlaceholder')}
              autoComplete="new-password"
              disabled={loading}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword', {
                required: t('erp.changePassword.confirmPasswordRequired'),
                validate: (value) => value === newPassword || t('erp.changePassword.passwordsMismatch'),
              })}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading || !passwordIsValid}
            >
              {loading ? (
                <span className="loading loading-spinner" />
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5" />
                  {t('erp.changePassword.submit')}
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-base-content/50">
            {t('erp.changePassword.footerNote')}
          </div>
        </div>
      </div>
    </div>
  );
}

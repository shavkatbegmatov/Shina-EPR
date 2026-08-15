import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Key,
  Loader2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import type { ChangePasswordRequest } from '../../types';
import { evaluatePassword } from '@/security/passwordPolicy';
import { GeneratePasswordButton } from './GeneratePasswordButton';
import { PasswordInput } from './PasswordInput';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Majburiy rejim — yopish/o'tkazib yuborish tugmalari ko'rsatilmaydi.
   *
   * <p>Vaqtinchalik parol Telegram xabarida yetkaziladi va uning xavfsizligi
   * "birinchi kirishda majburan almashtiriladi" degan va'daga tayanadi.
   * Ilgari bu va'da bajarilmasdi: X va "o'tkazib yuborish" tugmalari modalni
   * shunchaki yopar, server esa hech narsani talab qilmasdi. Endi server ham
   * `mustChangePassword` tirik ekan boshqa endpointlarni 403 qiladi.
   */
  forced?: boolean;
}

export function PasswordChangeModal({ isOpen, onClose, forced = false }: PasswordChangeModalProps) {
  const { t } = useTranslation();
  const [changingPassword, setChangingPassword] = useState(false);
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PasswordFormData>();

  const newPassword = watch('newPassword', '');
  const passwordIsValid = evaluatePassword(newPassword).isValid;

  const passwordValidationRule = (value: string) =>
    evaluatePassword(value).isValid || t('erp.passwordPolicy.requiredPolicy');

  const applyGeneratedPassword = (password: string) => {
    setValue('newPassword', password, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    setValue('confirmPassword', password, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  };

  const onSubmit = async (data: PasswordFormData) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error(t('erp.passwordChange.confirmMismatch'));
      return;
    }

    setChangingPassword(true);
    try {
      const request: ChangePasswordRequest = {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      };

      await authApi.changePassword(request);
      toast.success(t('erp.passwordChange.changeSuccess'));
      reset();
      onClose();

      // Force re-login after password change
      setTimeout(() => {
        logout();
        navigate('/admin/login');
      }, 1500);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || t('erp.passwordChange.changeError'));
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSkip = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="surface-card max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-base-200">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-warning/10">
              <AlertTriangle className="h-6 w-6 text-warning" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{t('erp.passwordChange.title')}</h3>
              <p className="text-sm text-base-content/60 mt-1">
                {t('erp.passwordChange.subtitle')}
              </p>
            </div>
          </div>
          {!forced && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              iconOnly
              onClick={handleSkip}
              disabled={changingPassword}
            >
              <XCircle className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Warning Message */}
          <div className="alert alert-warning">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">
              {t('erp.passwordChange.warningMessage')}
            </span>
          </div>

          <PasswordInput
            label={t('erp.passwordChange.currentPasswordLabel')}
            placeholder={t('erp.passwordChange.currentPasswordPlaceholder')}
            autoComplete="current-password"
            disabled={changingPassword}
            error={errors.currentPassword?.message}
            {...register('currentPassword', {
              required: t('erp.passwordChange.currentPasswordRequired'),
            })}
          />

          <PasswordInput
            label={t('erp.passwordChange.newPasswordLabel')}
            placeholder={t('erp.passwordChange.newPasswordPlaceholder')}
            autoComplete="new-password"
            disabled={changingPassword}
            error={errors.newPassword?.message}
            actions={<GeneratePasswordButton onGenerate={applyGeneratedPassword} disabled={changingPassword} />}
            {...register('newPassword', {
              required: t('erp.passwordChange.newPasswordRequired'),
              validate: passwordValidationRule,
            })}
          />

          <PasswordStrengthMeter password={newPassword} />

          <PasswordInput
            label={t('erp.passwordChange.confirmPasswordLabel')}
            placeholder={t('erp.passwordChange.confirmPasswordPlaceholder')}
            autoComplete="new-password"
            disabled={changingPassword}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword', {
              required: t('erp.passwordChange.confirmPasswordRequired'),
              validate: (value) => value === newPassword || t('erp.passwordChange.passwordsMismatch'),
            })}
          />

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={changingPassword || !passwordIsValid}
            >
              {changingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('erp.passwordChange.changing')}
                </>
              ) : (
                <>
                  <Key className="h-4 w-4" />
                  {t('erp.passwordChange.changeButton')}
                </>
              )}
            </Button>
            {!forced && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleSkip}
                disabled={changingPassword}
              >
                {t('erp.passwordChange.skipButton')}
              </Button>
            )}
          </div>

          <p className="text-xs text-base-content/50">
            {t('erp.passwordChange.footerNote')}
          </p>
        </form>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Key,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import type { ChangePasswordRequest } from '../../types';

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PasswordChangeModal({ isOpen, onClose }: PasswordChangeModalProps) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<PasswordFormData>();

  const newPassword = watch('newPassword', '');

  // Password strength indicators
  const hasMinLength = newPassword.length >= 6;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);

  const passwordStrength = [hasMinLength, hasUppercase, hasLowercase, hasNumber].filter(Boolean).length;

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-error';
    if (passwordStrength === 2) return 'bg-warning';
    if (passwordStrength === 3) return 'bg-info';
    return 'bg-success';
  };

  const getStrengthLabel = () => {
    if (passwordStrength <= 1) return 'Juda zaif';
    if (passwordStrength === 2) return 'Zaif';
    if (passwordStrength === 3) return 'Yaxshi';
    return 'Kuchli';
  };

  const onSubmit = async (data: PasswordFormData) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Yangi parol va tasdiqlash mos kelmadi');
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
      toast.success("Parol muvaffaqiyatli o'zgartirildi!");
      reset();
      onClose();

      // Force re-login after password change
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 1500);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Parolni o'zgartirishda xatolik");
    } finally {
      setChangingPassword(false);
    }
  };

  const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
    <div className={`flex items-center gap-2 text-sm ${met ? 'text-success' : 'text-base-content/50'}`}>
      {met ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
      <span>{text}</span>
    </div>
  );

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
              <h3 className="text-lg font-semibold">Parolingizni o'zgartiring</h3>
              <p className="text-sm text-base-content/60 mt-1">
                Xavfsizlik uchun admin tomonidan berilgan parolni o'zgartiring
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            onClick={handleSkip}
            disabled={changingPassword}
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Warning Message */}
          <div className="alert alert-warning">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">
              Siz hozircha admin tomonidan berilgan paroldan foydalanayapsiz.
              Xavfsizlik uchun uni o'zgartirishingizni tavsiya etamiz.
            </span>
          </div>

          {/* Current Password */}
          <div className="form-control">
            <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
              Joriy parol
            </span>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                placeholder="Joriy parolingizni kiriting"
                autoComplete="current-password"
                className={clsx(
                  'input input-bordered w-full pr-10',
                  errors.currentPassword && 'input-error'
                )}
                {...register('currentPassword', {
                  required: 'Joriy parol kiritilishi shart',
                })}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.currentPassword && (
              <span className="mt-1 text-xs text-error">{errors.currentPassword.message}</span>
            )}
          </div>

          {/* New Password */}
          <div className="form-control">
            <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
              Yangi parol
            </span>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Yangi xavfsiz parol"
                autoComplete="new-password"
                className={clsx(
                  'input input-bordered w-full pr-10',
                  errors.newPassword && 'input-error'
                )}
                {...register('newPassword', {
                  required: 'Yangi parol kiritilishi shart',
                  minLength: { value: 6, message: 'Parol kamida 6 belgi' },
                })}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.newPassword && (
              <span className="mt-1 text-xs text-error">{errors.newPassword.message}</span>
            )}
          </div>

          {/* Password Strength Indicator */}
          {newPassword && (
            <div className="space-y-3 p-4 rounded-xl bg-base-200/50">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-base-300 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                    style={{ width: `${(passwordStrength / 4) * 100}%` }}
                  />
                </div>
                <span className={`text-xs font-medium ${getStrengthColor().replace('bg-', 'text-')}`}>
                  {getStrengthLabel()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <PasswordRequirement met={hasMinLength} text="Kamida 6 belgi" />
                <PasswordRequirement met={hasUppercase} text="Katta harf" />
                <PasswordRequirement met={hasLowercase} text="Kichik harf" />
                <PasswordRequirement met={hasNumber} text="Raqam" />
              </div>
            </div>
          )}

          {/* Confirm Password */}
          <div className="form-control">
            <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
              Parolni tasdiqlash
            </span>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Yangi parolni qayta kiriting"
                autoComplete="new-password"
                className={clsx(
                  'input input-bordered w-full pr-10',
                  errors.confirmPassword && 'input-error'
                )}
                {...register('confirmPassword', {
                  required: 'Parolni tasdiqlash kiritilishi shart',
                  validate: (value) => value === newPassword || 'Parollar mos kelmadi',
                })}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <span className="mt-1 text-xs text-error">{errors.confirmPassword.message}</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={changingPassword || passwordStrength < 3}
            >
              {changingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  O'zgartirilmoqda...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4" />
                  Parolni o'zgartirish
                </>
              )}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleSkip}
              disabled={changingPassword}
            >
              Keyinroq
            </button>
          </div>

          <p className="text-xs text-base-content/50">
            Parol o'zgartirilgandan so'ng tizimga qayta kirishingiz kerak bo'ladi
          </p>
        </form>
      </div>
    </div>
  );
}

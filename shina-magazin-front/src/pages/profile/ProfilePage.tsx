import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  User,
  Mail,
  Phone,
  Shield,
  Key,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  UserCircle,
  Lock,
  AlertTriangle,
  Monitor,
  Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { authApi } from '../../api/auth.api';
import { rolesApi } from '../../api/roles.api';
import { useAuthStore } from '../../store/authStore';
import { ROLES } from '../../config/constants';
import type { ChangePasswordRequest, User as UserType, Role } from '../../types';
import { Button } from '@/ui';
import { SessionsTab } from './SessionsTab';
import { LoginActivityTab } from './LoginActivityTab';
import { ActivityHistoryTab } from './ActivityHistoryTab';

type Tab = 'profile' | 'security' | 'sessions' | 'login-activity' | 'activity';

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function ProfilePage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [userData, setUserData] = useState<UserType | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuthStore();

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
    if (passwordStrength <= 1) return t('erp.profile.strengthVeryWeak');
    if (passwordStrength === 2) return t('erp.profile.strengthWeak');
    if (passwordStrength === 3) return t('erp.profile.strengthGood');
    return t('erp.profile.strengthStrong');
  };

  // Fetch user data and roles
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userData, rolesData] = await Promise.all([
          authApi.getCurrentUser(),
          rolesApi.getAll(),
        ]);
        setUserData(userData);
        setRoles(rolesData);
      } catch {
        toast.error(t('erp.profile.loadError'));
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, []);

  // Helper function to get role label
  const getRoleLabel = (roleCode: string): string => {
    // First check if it's a legacy role
    const legacyRole = ROLES[roleCode as keyof typeof ROLES];
    if (legacyRole) {
      return legacyRole.label;
    }
    // Otherwise, find it in fetched roles
    const role = roles.find((r) => r.code === roleCode);
    return role?.name || roleCode;
  };

  const onSubmitPassword = async (data: PasswordFormData) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error(t('erp.profile.passwordMismatchConfirm'));
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
      toast.success(t('erp.profile.passwordChangedSuccess'));
      reset();

      // Force re-login after password change
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 1500);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || t('erp.profile.passwordChangeError'));
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

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-error/10 text-error border-error/20';
      case 'MANAGER':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'SELLER':
        return 'bg-info/10 text-info border-info/20';
      default:
        return 'bg-base-200 text-base-content/70 border-base-300';
    }
  };

  const userInitial = userData?.fullName?.charAt(0)?.toUpperCase() ||
    userData?.username?.charAt(0)?.toUpperCase() || '?';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="section-title">{t('erp.profile.title')}</h1>
        <p className="section-subtitle">{t('erp.profile.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-bordered overflow-x-auto scrollbar-hide">
        <button
          className={clsx('tab gap-2 text-xs sm:text-sm px-3 sm:px-4 min-h-[48px]', activeTab === 'profile' && 'tab-active')}
          onClick={() => setActiveTab('profile')}
        >
          <UserCircle className="h-4 w-4" />
          {t('erp.profile.tabProfile')}
        </button>
        <button
          className={clsx('tab gap-2 text-xs sm:text-sm px-3 sm:px-4 min-h-[48px]', activeTab === 'security' && 'tab-active')}
          onClick={() => setActiveTab('security')}
        >
          <Lock className="h-4 w-4" />
          {t('erp.profile.tabSecurity')}
        </button>
        <button
          className={clsx('tab gap-2 text-xs sm:text-sm px-3 sm:px-4 min-h-[48px]', activeTab === 'sessions' && 'tab-active')}
          onClick={() => setActiveTab('sessions')}
        >
          <Monitor className="h-4 w-4" />
          {t('erp.profile.tabSessions')}
        </button>
        <button
          className={clsx('tab gap-2 text-xs sm:text-sm px-3 sm:px-4 min-h-[48px]', activeTab === 'login-activity' && 'tab-active')}
          onClick={() => setActiveTab('login-activity')}
        >
          <Shield className="h-4 w-4" />
          {t('erp.profile.tabLoginActivity')}
        </button>
        <button
          className={clsx('tab gap-2 text-xs sm:text-sm px-3 sm:px-4 min-h-[48px]', activeTab === 'activity' && 'tab-active')}
          onClick={() => setActiveTab('activity')}
        >
          <Activity className="h-4 w-4" />
          {t('erp.profile.tabActivity')}
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* User Card */}
          <div className="surface-card p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              <div
                className={clsx(
                  'w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center flex-shrink-0',
                  'bg-gradient-to-br from-primary/20 to-secondary/20 text-primary',
                  'ring-4 ring-primary/10'
                )}
              >
                <span className="text-3xl sm:text-4xl font-bold">{userInitial}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold break-words">{userData?.fullName}</h2>
                <p className="text-sm sm:text-base text-base-content/60 truncate">@{userData?.username}</p>
                <div
                  className={clsx(
                    'inline-flex items-center gap-1 sm:gap-1.5 mt-2 sm:mt-3 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold border',
                    getRoleBadgeColor(userData?.role)
                  )}
                >
                  <Shield className="h-3.5 w-3.5" />
                  {userData?.role && getRoleLabel(userData.role)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {userData?.active ? (
                  <span className="badge badge-success gap-1">
                    <Check className="h-3 w-3" />
                    {t('erp.profile.statusActive')}
                  </span>
                ) : (
                  <span className="badge badge-error gap-1">
                    <X className="h-3 w-3" />
                    {t('erp.profile.statusInactive')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="surface-card p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6">{t('erp.profile.contactInfo')}</h3>
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
              {/* Email */}
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-base-200/50">
                <div className="p-2 sm:p-3 rounded-xl bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-base-content/50 uppercase tracking-wider">{t('erp.profile.labelEmail')}</p>
                  <p className="font-semibold">{userData?.email || t('erp.profile.notProvided')}</p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-base-200/50">
                <div className="p-2 sm:p-3 rounded-xl bg-primary/10">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-base-content/50 uppercase tracking-wider">{t('erp.profile.labelPhone')}</p>
                  <p className="font-semibold">{userData?.phone || t('erp.profile.notProvided')}</p>
                </div>
              </div>

              {/* Username */}
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-base-200/50">
                <div className="p-2 sm:p-3 rounded-xl bg-info/10">
                  <User className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-xs text-base-content/50 uppercase tracking-wider">{t('erp.profile.labelUsername')}</p>
                  <p className="font-semibold">{userData?.username}</p>
                </div>
              </div>

              {/* Role */}
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-base-200/50">
                <div className="p-2 sm:p-3 rounded-xl bg-warning/10">
                  <Shield className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-base-content/50 uppercase tracking-wider">{t('erp.profile.labelRole')}</p>
                  <p className="font-semibold">{userData?.role && getRoleLabel(userData.role)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Warning if user must change password */}
          {userData?.mustChangePassword && (
            <div className="alert alert-warning">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold">{t('erp.profile.mustChangeTitle')}</h4>
                  <p className="text-sm mt-1">
                    {t('erp.profile.mustChangeDesc')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="surface-card p-4 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="p-2 sm:p-3 rounded-xl bg-warning/10">
                <Key className="h-6 w-6 text-warning" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{t('erp.profile.changePasswordTitle')}</h3>
                <p className="text-sm text-base-content/60">
                  {t('erp.profile.changePasswordDesc')}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmitPassword)} className="w-full max-w-md space-y-3 sm:space-y-4">
              {/* Current Password */}
              <div className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  {t('erp.profile.currentPasswordLabel')}
                </span>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder={t('erp.profile.currentPasswordPlaceholder')}
                    autoComplete="current-password"
                    className={clsx(
                      'input input-bordered w-full pr-10',
                      errors.currentPassword && 'input-error'
                    )}
                    {...register('currentPassword', {
                      required: t('erp.profile.currentPasswordRequired'),
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
                  {t('erp.profile.newPasswordLabel')}
                </span>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder={t('erp.profile.newPasswordPlaceholder')}
                    autoComplete="new-password"
                    className={clsx(
                      'input input-bordered w-full pr-10',
                      errors.newPassword && 'input-error'
                    )}
                    {...register('newPassword', {
                      required: t('erp.profile.newPasswordRequired'),
                      minLength: { value: 6, message: t('erp.profile.passwordMinLength') },
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
                <div className="space-y-2 sm:space-y-3 p-3 sm:p-4 rounded-xl bg-base-200/50">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <PasswordRequirement met={hasMinLength} text={t('erp.profile.reqMinLength')} />
                    <PasswordRequirement met={hasUppercase} text={t('erp.profile.reqUppercase')} />
                    <PasswordRequirement met={hasLowercase} text={t('erp.profile.reqLowercase')} />
                    <PasswordRequirement met={hasNumber} text={t('erp.profile.reqNumber')} />
                  </div>
                </div>
              )}

              {/* Confirm Password */}
              <div className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  {t('erp.profile.confirmPasswordLabel')}
                </span>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder={t('erp.profile.confirmPasswordPlaceholder')}
                    autoComplete="new-password"
                    className={clsx(
                      'input input-bordered w-full pr-10',
                      errors.confirmPassword && 'input-error'
                    )}
                    {...register('confirmPassword', {
                      required: t('erp.profile.confirmPasswordRequired'),
                      validate: (value) => value === newPassword || t('erp.profile.passwordsDoNotMatch'),
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

              <div className="pt-2 sm:pt-3">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full sm:w-auto"
                  disabled={changingPassword || passwordStrength < 3}
                >
                  {changingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('erp.profile.changing')}
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4" />
                      {t('erp.profile.changePasswordButton')}
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-base-content/50">
                {t('erp.profile.reloginNote')}
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && <SessionsTab />}

      {/* Login Activity Tab */}
      {activeTab === 'login-activity' && <LoginActivityTab />}

      {/* Activity History Tab */}
      {activeTab === 'activity' && <ActivityHistoryTab />}
    </div>
  );
}

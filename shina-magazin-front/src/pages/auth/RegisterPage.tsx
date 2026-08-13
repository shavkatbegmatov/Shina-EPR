import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Send, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { Select } from '../../components/ui/Select';
import { staffRegistrationApi } from '../../api/staffRegistration.api';
import { getApiErrorMessage } from '../../utils/apiError';
import { Button } from '@/ui';
import type { StaffRegistrationSubmitRequest } from '../../types';

export function RegisterPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [telegramLink, setTelegramLink] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<StaffRegistrationSubmitRequest>({
    defaultValues: {
      requestedRole: 'SELLER',
    },
  });

  /**
   * Ilgari bu yerda `setTimeout` turardi: forma hech qayerga yuborilmasdi,
   * lekin "so'rov qabul qilindi" deb yozardi. Ya'ni ariza bergan odam hech
   * qachon kelmaydigan javobni kutardi.
   */
  const onSubmit = async (data: StaffRegistrationSubmitRequest) => {
    setLoading(true);
    try {
      const result = await staffRegistrationApi.submit(data);
      setSubmitted(true);
      // Bot sozlanmagan bo'lsa null keladi — u holda havola ko'rsatilmaydi.
      setTelegramLink(result.telegramLinkUrl ?? null);
      reset({ requestedRole: 'SELLER' });
      toast.success(t('erp.register.requestAccepted'));
    } catch (error) {
      // Takroriy so'rov, band raqam, chegaradan oshish — backend aniq
      // sabab qaytaradi, uni yashirib umumiy xabar berish foydasiz.
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 via-base-100 to-primary/10 p-4">
      <div className="mx-auto flex min-h-screen max-w-xl items-center">
        <div className="surface-card w-full rounded-3xl p-8 shadow-[var(--shadow-strong)]">
          <div className="mb-6">
            <div className="pill w-fit">Access</div>
            <h1 className="mt-3 text-3xl font-semibold">{t('erp.register.title')}</h1>
            <p className="text-sm text-base-content/60">
              {t('erp.register.subtitle')}
            </p>
          </div>

          {/* So'rov haqiqatan saqlangach, keyingi qadam nima ekanini aytamiz —
              odam javobni qanchagacha kutishini bilsin. */}
          {submitted && (
            <div className="mb-4 space-y-3">
              <div className="alert alert-success">
                <span className="text-sm">{t('erp.register.pendingHint')}</span>
              </div>

              {/* Telegram botlari foydalanuvchiga BIRINCHI bo'lib yozolmaydi —
                  arizachi shu havolani ochib START bosmasa, unga qaror haqida
                  xabar yuborishning imkoni yo'q. */}
              {telegramLink && (
                <div className="rounded-2xl border border-base-200 bg-base-200/50 p-4">
                  <p className="text-sm font-medium">{t('erp.register.telegramTitle')}</p>
                  <p className="mt-1 text-xs text-base-content/60">
                    {t('erp.register.telegramHint')}
                  </p>
                  <a
                    href={telegramLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm mt-3 w-full"
                  >
                    <Send className="h-4 w-4" />
                    {t('erp.register.telegramCta')}
                  </a>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <label className="form-control">
              <span className="label-text text-sm">{t('erp.register.fullName')}</span>
              <input
                type="text"
                className={`input input-bordered w-full ${errors.fullName ? 'input-error' : ''}`}
                placeholder={t('erp.register.fullNamePlaceholder')}
                {...register('fullName', {
                  required: t('erp.register.fullNameRequired'),
                })}
              />
              {errors.fullName && (
                <span className="mt-1 text-xs text-error">
                  {errors.fullName.message}
                </span>
              )}
            </label>

            <Controller
              name="phone"
              control={control}
              rules={{ required: t('erp.register.phoneRequired') }}
              render={({ field }) => (
                <PhoneInput
                  label={t('erp.register.phone')}
                  value={field.value || ''}
                  onChange={field.onChange}
                  error={errors.phone?.message}
                  required
                />
              )}
            />

            <label className="form-control">
              <span className="label-text text-sm">{t('erp.register.company')}</span>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder={t('erp.register.companyPlaceholder')}
                {...register('companyName')}
              />
            </label>

            <Controller
              name="requestedRole"
              control={control}
              render={({ field }) => (
                <Select
                  label={t('erp.register.role')}
                  value={field.value}
                  onChange={(val) => field.onChange(val)}
                  options={[
                    { value: 'SELLER', label: t('erp.register.roleSeller') },
                    { value: 'MANAGER', label: t('erp.register.roleManager') },
                    { value: 'ADMIN', label: t('erp.register.roleAdmin') },
                  ]}
                  placeholder={t('erp.register.rolePlaceholder')}
                />
              )}
            />

            <label className="form-control">
              <span className="label-text text-sm">{t('erp.register.note')}</span>
              <textarea
                className="textarea textarea-bordered min-h-[96px]"
                placeholder={t('erp.register.notePlaceholder')}
                {...register('note')}
              />
            </label>

            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading ? (
                <span className="loading loading-spinner" />
              ) : (
                <>
                  <UserPlus className="h-5 w-5" />
                  {t('erp.register.submit')}
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-base-content/60">
            {t('erp.register.haveAccount')}{' '}
            <Link to="/admin/login" className="link link-primary">
              {t('erp.register.login')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

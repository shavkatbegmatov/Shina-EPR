import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, KeyRound, UserPlus, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { staffRegistrationApi } from '../../api/staffRegistration.api';
import { Select } from '../../components/ui/Select';
import { PermissionGate } from '../../components/common/PermissionGate';
import { PermissionCode } from '../../hooks/usePermission';
import { getApiErrorMessage } from '../../utils/apiError';
import { Button, Modal } from '@/ui';
import type { CredentialsInfo, StaffRegistration, StaffRegistrationStatus } from '../../types';

const TABS: StaffRegistrationStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

/**
 * Tanlash mumkin bo'lgan rollar.
 *
 * <p>ATAYLAB qat'iy ro'yxat, `/v1/roles` dan olinmaydi: u endpoint
 * `ROLES_VIEW` talab qiladi, ya'ni arizani tasdiqlay oladigan
 * (`EMPLOYEES_CREATE`) lekin rollarni ko'ra olmaydigan xodimda sahifa
 * ishlamay qolardi. Bular V11 seed'idagi tizim rollari.
 */
const ROLE_OPTIONS = [
  { value: 'SELLER', labelKey: 'erp.register.roleSeller' },
  { value: 'MANAGER', labelKey: 'erp.register.roleManager' },
  { value: 'ADMIN', labelKey: 'erp.register.roleAdmin' },
] as const;

/**
 * Xodimlikka kelgan arizalar — ko'rib chiqish sahifasi.
 *
 * <p>`/admin/register` ommaviy, ya'ni istalgan odam ariza yubora oladi.
 * Huquq shu yerda beriladi: tasdiqlangandagina xodim yozuvi va akkaunt
 * yaratiladi.
 */
export function StaffRequestsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<StaffRegistrationStatus>('PENDING');
  const [rejecting, setRejecting] = useState<StaffRegistration | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [credentials, setCredentials] = useState<CredentialsInfo | null>(null);
  // Tasdiqlash darhol emas, oyna orqali: rolni ARIZACHI emas, xodim tanlaydi.
  const [approving, setApproving] = useState<StaffRegistration | null>(null);
  const [approveRole, setApproveRole] = useState('SELLER');
  const [approvePosition, setApprovePosition] = useState('');

  // Sabab arizachiga Telegram orqali yetkaziladi — modal ochilganda u
  // ALBATTA tozalanishi kerak, aks holda oldingi arizachiga yozilgan matn
  // (masalan "soxta telefon raqami") keyingisiga ketib qolardi.
  const openReject = (request: StaffRegistration) => {
    setRejecting(request);
    setRejectReason('');
  };

  const closeReject = () => {
    setRejecting(null);
    setRejectReason('');
  };

  const openApprove = (request: StaffRegistration) => {
    setApproving(request);
    // Arizadagi rol boshlang'ich qiymat sifatida qulay, lekin u faqat taklif —
    // xodim uni o'zgartira oladi.
    setApproveRole(
      ROLE_OPTIONS.some((r) => r.value === request.requestedRole) ? request.requestedRole : 'SELLER'
    );
    setApprovePosition('');
  };

  const requestsQuery = useQuery({
    queryKey: ['staff-registration', tab],
    queryFn: () => staffRegistrationApi.getAll(tab),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['staff-registration'] });
    void queryClient.invalidateQueries({ queryKey: ['employees'] });
  };

  const approveMutation = useMutation({
    mutationFn: ({ id, roleCode, position }: { id: number; roleCode: string; position?: string }) =>
      staffRegistrationApi.approve(id, { roleCode, position: position || undefined }),
    onSuccess: (employee) => {
      refresh();
      setApproving(null);
      // Kredensiallar BIR MARTA ko'rsatiladi — serverda ochiq saqlanmaydi,
      // shuning uchun modal yopilgach ularni qayta olib bo'lmaydi.
      if (employee.newCredentials) {
        setCredentials(employee.newCredentials);
      } else {
        toast.success(t('erp.staffRequests.approved'));
      }
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      staffRegistrationApi.reject(id, reason || undefined),
    onSuccess: () => {
      refresh();
      setRejecting(null);
      setRejectReason('');
      toast.success(t('erp.staffRequests.rejected'));
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const requests = requestsQuery.data?.content ?? [];
  const busy = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('erp.staffRequests.title')}</h1>
        <p className="text-sm text-base-content/60">{t('erp.staffRequests.subtitle')}</p>
      </div>

      <div role="tablist" className="tabs tabs-boxed w-fit">
        {TABS.map((status) => (
          <button
            key={status}
            role="tab"
            className={clsx('tab', tab === status && 'tab-active')}
            onClick={() => setTab(status)}
          >
            {t(`erp.staffRequests.status.${status}`)}
          </button>
        ))}
      </div>

      {requestsQuery.isPending && <div className="skeleton h-32 w-full" />}

      {requestsQuery.isError && (
        <div className="alert alert-error">
          <span>{getApiErrorMessage(requestsQuery.error)}</span>
          <Button size="sm" variant="outline" onClick={() => void requestsQuery.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      )}

      {!requestsQuery.isPending && !requestsQuery.isError && requests.length === 0 && (
        <div className="surface-card flex flex-col items-center gap-3 p-10 text-center">
          <UserPlus className="h-10 w-10 text-base-content/40" />
          <p className="text-sm text-base-content/60">{t('erp.staffRequests.empty')}</p>
        </div>
      )}

      <div className="space-y-3">
        {requests.map((request) => (
          <div key={request.id} className="surface-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{request.fullName}</span>
                  <span className="badge badge-ghost badge-sm">{request.requestedRole}</span>
                  {request.status === 'PENDING' && (
                    <span className="badge badge-warning badge-sm gap-1">
                      <Clock className="h-3 w-3" />
                      {t('erp.staffRequests.status.PENDING')}
                    </span>
                  )}
                  {request.status === 'APPROVED' && (
                    <span className="badge badge-success badge-sm gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {t('erp.staffRequests.status.APPROVED')}
                    </span>
                  )}
                  {request.status === 'REJECTED' && (
                    <span className="badge badge-error badge-sm gap-1">
                      <XCircle className="h-3 w-3" />
                      {t('erp.staffRequests.status.REJECTED')}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-base-content/70">{request.phone}</p>
                {request.companyName && (
                  <p className="text-sm text-base-content/60">{request.companyName}</p>
                )}
                {request.note && (
                  <p className="mt-2 whitespace-pre-line text-sm text-base-content/60">{request.note}</p>
                )}
                {request.rejectReason && (
                  <p className="mt-2 text-sm text-error">{request.rejectReason}</p>
                )}
                {request.reviewedByName && (
                  <p className="mt-2 text-xs text-base-content/50">
                    {t('erp.staffRequests.reviewedBy', { name: request.reviewedByName })}
                  </p>
                )}
              </div>

              {request.status === 'PENDING' && (
                <PermissionGate permission={PermissionCode.EMPLOYEES_CREATE}>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={busy}
                      onClick={() => openApprove(request)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {t('erp.staffRequests.approve')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => openReject(request)}
                    >
                      <XCircle className="h-4 w-4" />
                      {t('erp.staffRequests.reject')}
                    </Button>
                  </div>
                </PermissionGate>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tasdiqlash — rolni SHU YERDA xodim tanlaydi.
          Forma ommaviy, ya'ni istalgan odam o'ziga ADMIN so'rab yuborishi
          mumkin; arizadagi qiymat faqat boshlang'ich taklif sifatida keladi. */}
      <Modal
        open={approving !== null}
        onClose={() => setApproving(null)}
        title={t('erp.staffRequests.approveTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setApproving(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              disabled={approveMutation.isPending}
              onClick={() =>
                approving &&
                approveMutation.mutate({
                  id: approving.id,
                  roleCode: approveRole,
                  position: approvePosition,
                })
              }
            >
              {t('erp.staffRequests.approve')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-base-content/70">
          {approving?.fullName} · {approving?.phone}
        </p>
        <p className="mt-1 text-xs text-base-content/50">
          {t('erp.staffRequests.requestedRole', { role: approving?.requestedRole ?? '' })}
        </p>

        <div className="mt-4 space-y-4">
          <Select
            label={t('erp.staffRequests.roleLabel')}
            value={approveRole}
            onChange={(value) => setApproveRole(String(value))}
            options={ROLE_OPTIONS.map((role) => ({ value: role.value, label: t(role.labelKey) }))}
          />

          {/* ADMIN — butun tizimga to'liq kirish. Ommaviy formadan kelgan
              arizani e'tiborsiz tasdiqlash bilan berib yubormaslik uchun. */}
          {approveRole === 'ADMIN' && (
            <div className="alert alert-warning">
              <span className="text-sm">{t('erp.staffRequests.adminWarning')}</span>
            </div>
          )}

          <label className="form-control">
            <span className="label-text mb-1 text-sm">{t('erp.staffRequests.positionLabel')}</span>
            <input
              className="input input-bordered w-full"
              maxLength={100}
              placeholder={t('erp.staffRequests.positionPlaceholder')}
              value={approvePosition}
              onChange={(e) => setApprovePosition(e.target.value)}
            />
          </label>
        </div>
      </Modal>

      {/* Rad etish sababi ixtiyoriy, lekin uni yozib qo'yish keyin
          "nega rad etilgan edi?" degan savolga javob beradi. */}
      <Modal
        open={rejecting !== null}
        onClose={closeReject}
        title={t('erp.staffRequests.rejectTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={closeReject}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              disabled={rejectMutation.isPending}
              onClick={() =>
                rejecting && rejectMutation.mutate({ id: rejecting.id, reason: rejectReason })
              }
            >
              {t('erp.staffRequests.reject')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-base-content/70">
          {rejecting?.fullName} · {rejecting?.phone}
        </p>
        <textarea
          className="textarea textarea-bordered mt-4 min-h-[96px] w-full"
          placeholder={t('erp.staffRequests.rejectReasonPlaceholder')}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          maxLength={500}
        />
      </Modal>

      {/* Kredensiallar bir martalik: parol serverda ochiq saqlanmaydi. */}
      <Modal
        open={credentials !== null}
        onClose={() => setCredentials(null)}
        title={t('erp.staffRequests.credentialsTitle')}
        footer={
          <Button variant="primary" onClick={() => setCredentials(null)}>
            {t('common.close')}
          </Button>
        }
      >
        <div className="alert alert-warning">
          <KeyRound className="h-5 w-5" />
          <span className="text-sm">{t('erp.staffRequests.credentialsWarning')}</span>
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <span className="text-xs uppercase tracking-wide text-base-content/50">
              {t('erp.staffRequests.username')}
            </span>
            <p className="font-mono text-lg">{credentials?.username}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-base-content/50">
              {t('erp.staffRequests.tempPassword')}
            </span>
            <p className="font-mono text-lg">{credentials?.temporaryPassword}</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

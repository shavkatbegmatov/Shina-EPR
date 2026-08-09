import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, KeyRound, UserPlus, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { staffRegistrationApi } from '../../api/staffRegistration.api';
import { PermissionGate } from '../../components/common/PermissionGate';
import { PermissionCode } from '../../hooks/usePermission';
import { getApiErrorMessage } from '../../utils/apiError';
import { Button, Modal } from '@/ui';
import type { CredentialsInfo, StaffRegistration, StaffRegistrationStatus } from '../../types';

const TABS: StaffRegistrationStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

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

  const requestsQuery = useQuery({
    queryKey: ['staff-registration', tab],
    queryFn: () => staffRegistrationApi.getAll(tab),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['staff-registration'] });
    void queryClient.invalidateQueries({ queryKey: ['employees'] });
  };

  const approveMutation = useMutation({
    mutationFn: (request: StaffRegistration) => staffRegistrationApi.approve(request.id),
    onSuccess: (employee) => {
      refresh();
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
                      onClick={() => approveMutation.mutate(request)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {t('erp.staffRequests.approve')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => setRejecting(request)}
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

      {/* Rad etish sababi ixtiyoriy, lekin uni yozib qo'yish keyin
          "nega rad etilgan edi?" degan savolga javob beradi. */}
      <Modal
        open={rejecting !== null}
        onClose={() => setRejecting(null)}
        title={t('erp.staffRequests.rejectTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejecting(null)}>
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

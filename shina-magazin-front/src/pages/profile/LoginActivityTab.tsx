import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, CheckCircle, XCircle, Calendar, MapPin, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { loginActivityApi, type LoginAttempt } from '../../api/login-activity.api';
import { formatDistanceToNow } from 'date-fns';
import { uz } from 'date-fns/locale';
import api from '../../api/axios';
import { useDataRefresh } from '../../hooks/useDataRefresh';
import { RefreshButton } from '../../components/common/RefreshButton';
import { ExportButtons } from '../../components/common/ExportButtons';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import { Button, buttonVariants } from '@/ui';

export function LoginActivityTab() {
  const { t } = useTranslation();
  const [attempts, setAttempts] = useState<LoginAttempt[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  const { initialLoading, refreshing, refreshSuccess, loadData } = useDataRefresh({
    fetchFn: async () => {
      const data = await loginActivityApi.getMyLoginHistory(currentPage, 20);
      setAttempts(data.content);
      setTotalPages(data.totalPages);
      return data;
    },
    onError: () => toast.error(t('erp.loginActivity.loadError')),
  });

  useEffect(() => {
    loadData(false);
  }, [currentPage, loadData]);

  const getStatusBadge = (attempt: LoginAttempt) => {
    if (attempt.status === 'SUCCESS') {
      return (
        <span className="badge badge-success gap-1">
          <CheckCircle className="h-3 w-3" />
          {t('erp.loginActivity.statusSuccess')}
        </span>
      );
    }
    return (
      <span className="badge badge-error gap-1">
        <XCircle className="h-3 w-3" />
        {t('erp.loginActivity.statusFailed')}
      </span>
    );
  };

  const formatTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: uz,
    });
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      toast.loading(t('erp.loginActivity.exportPreparing', { format: format === 'excel' ? 'Excel' : 'PDF' }), { id: 'export' });

      const response = await api.get('/v1/login-activity/export', {
        params: { format },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `login_activity_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success(t('erp.loginActivity.fileDownloaded'), { id: 'export' });
    } catch {
      toast.error(t('erp.loginActivity.exportError'), { id: 'export' });
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3 sm:gap-4">
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-semibold">{t('erp.loginActivity.title')}</h3>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            {t('erp.loginActivity.subtitle')}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <RefreshButton
            onClick={() => loadData(true)}
            loading={refreshing}
            success={refreshSuccess}
            disabled={initialLoading}
            className="flex-1 sm:flex-none"
          />
          <ExportButtons
            onExportExcel={() => handleExport('excel')}
            onExportPdf={() => handleExport('pdf')}
            disabled={attempts.length === 0}
            loading={refreshing}
          />
        </div>
      </div>

      {/* Login attempts list */}
      <div className="relative">
        <LoadingOverlay show={refreshing} message={t('erp.loginActivity.refreshing')} />
        {attempts.length > 0 ? (
          <div className="space-y-3">
          {attempts.map((attempt) => (
            <div key={attempt.id} className="surface-card p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                <div className="flex items-start gap-3 sm:gap-4 flex-1 w-full">
                  <div className={`p-3 rounded-xl flex-shrink-0 ${
                    attempt.status === 'SUCCESS' ? 'bg-success/10' : 'bg-error/10'
                  }`}>
                    {attempt.status === 'SUCCESS' ? (
                      <CheckCircle className="h-5 w-5 text-success" />
                    ) : (
                      <XCircle className="h-5 w-5 text-error" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold truncate max-w-[200px] sm:max-w-none">
                        {attempt.browser} - {attempt.os}
                      </h4>
                      {getStatusBadge(attempt)}
                    </div>
                    <p className="text-sm text-base-content/60 mt-1">
                      {attempt.deviceType}
                    </p>
                    {attempt.failureReason && (
                      <p className="text-xs text-error mt-1">
                        {t('erp.loginActivity.reason', { reason: attempt.failureReason })}
                      </p>
                    )}
                    <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-4 mt-2 sm:mt-3 text-xs text-base-content/50">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="break-all text-xs">{attempt.ipAddress}</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span className="text-xs">{formatTimeAgo(attempt.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="surface-card p-12 text-center">
          <Shield className="h-12 w-12 mx-auto text-base-content/30" />
          <h4 className="text-lg font-semibold mt-4">{t('erp.loginActivity.emptyTitle')}</h4>
          <p className="text-sm text-base-content/60 mt-2">
            {t('erp.loginActivity.emptyDescription')}
          </p>
        </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0 || refreshing}
          >
            {t('erp.loginActivity.previous')}
          </Button>
          <span className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            {currentPage + 1} / {totalPages}
          </span>
          <Button
            variant="default"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPage === totalPages - 1 || refreshing}
          >
            {t('erp.loginActivity.next')}
          </Button>
        </div>
      )}

      {/* Security notice */}
      <div className="alert alert-info">
        <Shield className="h-5 w-5" />
        <div className="text-sm">
          <p className="font-semibold">{t('erp.loginActivity.securityNoticeTitle')}</p>
          <p className="mt-1">
            {t('erp.loginActivity.securityNoticeText')}
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Loader2, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { usersApi, type UserActivity } from '../../api/users.api';
import type { AuditLog } from '../../api/audit-logs.api';
import type { FieldChange } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useDataRefresh } from '../../hooks/useDataRefresh';
import { RefreshButton } from '../../components/common/RefreshButton';
import { ExportButtons } from '../../components/common/ExportButtons';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import { AuditLogExpandableRow } from '../../components/audit-logs/AuditLogExpandableRow';
import { AuditLogMobileCard } from '../../components/audit-logs/AuditLogMobileCard';
import { Button } from '@/ui';

export function ActivityHistoryTab() {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const { user } = useAuthStore();

  // Expandable row state
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [fieldChangesCache, setFieldChangesCache] = useState<Map<number, FieldChange[]>>(
    new Map()
  );

  const { initialLoading, refreshing, refreshSuccess, loadData } = useDataRefresh({
    fetchFn: async () => {
      if (!user?.id) return;

      const data = await usersApi.getUserActivity(
        user.id,
        currentPage,
        20,
        entityTypeFilter || undefined,
        actionFilter || undefined
      );

      setActivities(data.content);
      setTotalPages(data.totalPages);
      return data;
    },
    onError: () => toast.error(t('erp.activityHistory.loadError')),
  });

  useEffect(() => {
    if (user?.id) {
      loadData(false);
      // Clear expanded rows and cache when filters change
      setExpandedRows(new Set());
      setFieldChangesCache(new Map());
    }
  }, [currentPage, entityTypeFilter, actionFilter, user]);

  const resetFilters = () => {
    setEntityTypeFilter('');
    setActionFilter('');
    setCurrentPage(0);
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!user?.id) return;

    try {
      await usersApi.exportUserActivity(user.id, format, {
        entityType: entityTypeFilter || undefined,
        action: actionFilter || undefined,
      });
      toast.success(
        t('erp.activityHistory.fileDownloaded', { format: format === 'excel' ? 'Excel' : 'PDF' })
      );
    } catch {
      toast.error(t('erp.activityHistory.exportError'));
    }
  };

  const handleToggleExpand = (activityId: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      return newSet;
    });
  };

  const handleLoadDetail = async (activityId: number) => {
    if (fieldChangesCache.has(activityId)) return; // Already loaded

    try {
      // Use audit logs detail endpoint since user activities are audit logs
      const detail = await import('../../api/audit-logs.api').then((mod) =>
        mod.auditLogsApi.getDetail(activityId)
      );
      setFieldChangesCache((prev) => {
        const newMap = new Map(prev);
        newMap.set(activityId, detail.fieldChanges);
        return newMap;
      });
    } catch (err) {
      console.error('Failed to load field changes:', err);
      toast.error(t('erp.activityHistory.loadDetailError'));
    }
  };

  // Convert UserActivity to AuditLog format for the expandable row component
  const convertToAuditLog = (activity: UserActivity): AuditLog => {
    return {
      id: activity.id,
      entityType: activity.entityType,
      entityId: activity.entityId,
      action: activity.action,
      oldValue: null, // Will be loaded in detail if needed
      newValue: null, // Will be loaded in detail if needed
      userId: user?.id || null,
      username: activity.username,
      ipAddress: activity.ipAddress,
      userAgent: `${activity.deviceType} - ${activity.browser}`, // Combine for display
      correlationId: null,
      createdAt: activity.timestamp,
    };
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
          <h3 className="text-base sm:text-lg font-semibold">{t('erp.activityHistory.title')}</h3>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            {t('erp.activityHistory.subtitle')}
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
            disabled={activities.length === 0}
            loading={refreshing}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="surface-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-base-content/60" />
          <span className="text-sm font-medium">{t('erp.activityHistory.filters')}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            className="select select-bordered w-full select-sm"
            value={entityTypeFilter}
            onChange={(e) => {
              setEntityTypeFilter(e.target.value);
              setCurrentPage(0);
            }}
          >
            <option value="">{t('erp.activityHistory.allEntities')}</option>
            <option value="Product">{t('erp.activityHistory.entityProduct')}</option>
            <option value="Sale">{t('erp.activityHistory.entitySale')}</option>
            <option value="Customer">{t('erp.activityHistory.entityCustomer')}</option>
            <option value="PurchaseOrder">{t('erp.activityHistory.entityPurchaseOrder')}</option>
            <option value="Payment">{t('erp.activityHistory.entityPayment')}</option>
            <option value="User">{t('erp.activityHistory.entityUser')}</option>
          </select>

          <select
            className="select select-bordered w-full select-sm"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setCurrentPage(0);
            }}
          >
            <option value="">{t('erp.activityHistory.allActions')}</option>
            <option value="CREATE">{t('erp.activityHistory.actionCreate')}</option>
            <option value="UPDATE">{t('erp.activityHistory.actionUpdate')}</option>
            <option value="DELETE">{t('erp.activityHistory.actionDelete')}</option>
          </select>

          {(entityTypeFilter || actionFilter) && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              {t('common.clear')}
            </Button>
          )}
        </div>
      </div>

      {/* Activity Table */}
      <div className="relative">
        <LoadingOverlay show={refreshing} message={t('erp.activityHistory.refreshing')} />
        {activities.length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="hidden md:block surface-card overflow-x-auto">
              <table className="table w-full table-sm">
                <thead className="bg-base-200">
                  <tr>
                    <th className="w-12"></th>
                    <th className="text-left">ID</th>
                    <th className="text-left">{t('erp.activityHistory.colEntity')}</th>
                    <th className="text-left">{t('erp.activityHistory.colAction')}</th>
                    <th className="text-left">{t('erp.activityHistory.colTime')}</th>
                    <th className="text-left">{t('erp.activityHistory.colUser')}</th>
                    <th className="text-left">{t('erp.activityHistory.colIpAddress')}</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity) => (
                    <AuditLogExpandableRow
                      key={activity.id}
                      log={convertToAuditLog(activity)}
                      isExpanded={expandedRows.has(activity.id)}
                      onToggle={() => handleToggleExpand(activity.id)}
                      fieldChanges={fieldChangesCache.get(activity.id)}
                      onLoadDetail={() => handleLoadDetail(activity.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden space-y-3">
              {activities.map((activity) => (
                <AuditLogMobileCard
                  key={activity.id}
                  log={convertToAuditLog(activity)}
                  isExpanded={expandedRows.has(activity.id)}
                  onToggle={() => handleToggleExpand(activity.id)}
                  fieldChanges={fieldChangesCache.get(activity.id)}
                  onLoadDetail={() => handleLoadDetail(activity.id)}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="surface-card p-8 sm:p-12 text-center">
            <Activity className="h-12 w-12 mx-auto text-base-content/30 mb-4" />
            <p className="text-sm sm:text-base text-base-content/60">
              {entityTypeFilter || actionFilter
                ? t('erp.activityHistory.noActivityForFilters')
                : t('erp.activityHistory.noActivityYet')}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 sm:gap-4">
          <Button
            variant="default"
            className="btn-md sm:btn-sm min-h-[44px] sm:min-h-0"
            onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
            disabled={currentPage === 0 || refreshing}
          >
            {t('erp.activityHistory.previous')}
          </Button>
          <span className="flex items-center px-3 sm:px-4 text-base sm:text-sm font-medium">
            {currentPage + 1} / {totalPages}
          </span>
          <Button
            variant="default"
            className="btn-md sm:btn-sm min-h-[44px] sm:min-h-0"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPage >= totalPages - 1 || refreshing}
          >
            {t('erp.activityHistory.next')}
          </Button>
        </div>
      )}
    </div>
  );
}

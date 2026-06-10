import { useState, useEffect } from 'react';
import {
  Shield,
  Loader2,
  Filter,
  Search,
  X,
  Layers,
  List,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { auditLogsApi, type AuditLog } from '../../api/audit-logs.api';
import type { FieldChange, AuditLogGroup } from '../../types';
import { useDataRefresh } from '../../hooks/useDataRefresh';
import { RefreshButton } from '../../components/common/RefreshButton';
import { ExportButtons } from '../../components/common/ExportButtons';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import { AuditLogExpandableRow } from '../../components/audit-logs/AuditLogExpandableRow';
import { AuditLogMobileCard } from '../../components/audit-logs/AuditLogMobileCard';
import { AuditLogGroupCard, AuditLogGroupRow } from '../../components/audit-logs/AuditLogGroupCard';
import { Button } from '@/ui';

type ViewMode = 'grouped' | 'simple';

export function AuditLogsPage() {
  const { t } = useTranslation();

  // View mode state - default to grouped
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');

  // Simple view state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Grouped view state
  const [auditLogGroups, setAuditLogGroups] = useState<AuditLogGroup[]>([]);

  // Common state
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Expandable row state (for simple view)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [fieldChangesCache, setFieldChangesCache] = useState<Map<number, FieldChange[]>>(
    new Map()
  );

  const { initialLoading, refreshing, refreshSuccess, loadData } = useDataRefresh({
    fetchFn: async () => {
      if (viewMode === 'grouped') {
        const data = await auditLogsApi.searchGroupedAuditLogs(
          currentPage,
          20,
          entityTypeFilter || undefined,
          actionFilter || undefined,
          undefined,
          searchQuery || undefined
        );
        setAuditLogGroups(data.content);
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);
        return data;
      } else {
        const data = await auditLogsApi.searchAuditLogs(
          currentPage,
          20,
          entityTypeFilter || undefined,
          actionFilter || undefined,
          undefined,
          searchQuery || undefined
        );
        setAuditLogs(data.content);
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);
        return data;
      }
    },
    onError: () => toast.error(t('erp.auditLogs.loadError')),
  });

  useEffect(() => {
    loadData(false);
    // Clear expanded rows and cache when filters change
    setExpandedRows(new Set());
    setFieldChangesCache(new Map());
  }, [currentPage, entityTypeFilter, actionFilter, searchQuery, viewMode]);

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setCurrentPage(0);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setCurrentPage(0);
  };

  const resetFilters = () => {
    setEntityTypeFilter('');
    setActionFilter('');
    setSearchInput('');
    setSearchQuery('');
    setCurrentPage(0);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    if (mode !== viewMode) {
      setViewMode(mode);
      setCurrentPage(0);
    }
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      await auditLogsApi.exportAuditLogs(format, {
        entityType: entityTypeFilter || undefined,
        action: actionFilter || undefined,
        search: searchQuery || undefined,
      });
      toast.success(t('erp.auditLogs.exportSuccess', { format: format === 'excel' ? 'Excel' : 'PDF' }));
    } catch {
      toast.error(t('erp.auditLogs.exportError'));
    }
  };

  const handleToggleExpand = (logId: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const handleLoadDetail = async (logId: number) => {
    if (fieldChangesCache.has(logId)) return; // Already loaded

    try {
      const detail = await auditLogsApi.getDetail(logId);
      setFieldChangesCache((prev) => {
        const newMap = new Map(prev);
        newMap.set(logId, detail.fieldChanges);
        return newMap;
      });
    } catch (err) {
      console.error('Failed to load field changes:', err);
      toast.error(t('erp.auditLogs.detailError'));
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Shield className="h-7 w-7" />
            {t('erp.auditLogs.title')}
          </h1>
          <p className="text-sm text-base-content/60 mt-1">
            {t('erp.auditLogs.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {/* View mode toggle */}
          <div className="join">
            <Button
              variant={viewMode === 'grouped' ? 'primary' : 'ghost'}
              size="sm"
              className="join-item min-h-[36px] gap-1.5"
              onClick={() => handleViewModeChange('grouped')}
              title={t('erp.auditLogs.groupedViewTitle')}
            >
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">{t('erp.auditLogs.groupedView')}</span>
            </Button>
            <Button
              variant={viewMode === 'simple' ? 'primary' : 'ghost'}
              size="sm"
              className="join-item min-h-[36px] gap-1.5"
              onClick={() => handleViewModeChange('simple')}
              title={t('erp.auditLogs.simpleViewTitle')}
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">{t('erp.auditLogs.simpleView')}</span>
            </Button>
          </div>

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
            disabled={viewMode === 'grouped' ? auditLogGroups.length === 0 : auditLogs.length === 0}
            loading={refreshing}
          />
        </div>
      </div>

      {/* Search and Filters */}
      <div className="surface-card p-4 space-y-4">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/40" />
            <input
              type="text"
              className="input input-bordered w-full pl-10 pr-10"
              placeholder={t('erp.auditLogs.searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            {searchInput && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content min-h-[44px] min-w-[44px] flex items-center justify-center"
                onClick={handleClearSearch}
              >
                <X className="h-5 w-5 sm:h-4 sm:w-4" />
              </button>
            )}
          </div>
          <Button
            variant="primary"
            className="w-full sm:w-auto min-h-[44px] gap-2"
            onClick={handleSearch}
            disabled={refreshing}
          >
            <Search className="h-5 w-5 sm:h-4 sm:w-4" />
            <span>{t('common.search')}</span>
          </Button>
        </div>

        {/* Filters */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-base-content/60" />
            <span className="text-sm font-medium">{t('common.filter')}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              className="select select-bordered w-full"
              value={entityTypeFilter}
              onChange={(e) => {
                setEntityTypeFilter(e.target.value);
                setCurrentPage(0);
              }}
            >
              <option value="">{t('erp.auditLogs.allEntities')}</option>
              <option value="Product">{t('erp.auditLogs.entityProduct')}</option>
              <option value="Sale">{t('erp.auditLogs.entitySale')}</option>
              <option value="Customer">{t('erp.auditLogs.entityCustomer')}</option>
              <option value="PurchaseOrder">{t('erp.auditLogs.entityPurchaseOrder')}</option>
              <option value="Payment">{t('erp.auditLogs.entityPayment')}</option>
              <option value="User">{t('erp.auditLogs.entityUser')}</option>
              <option value="Employee">{t('erp.auditLogs.entityEmployee')}</option>
              <option value="Role">{t('erp.auditLogs.entityRole')}</option>
              <option value="Supplier">{t('erp.auditLogs.entitySupplier')}</option>
              <option value="Brand">{t('erp.auditLogs.entityBrand')}</option>
              <option value="Category">{t('erp.auditLogs.entityCategory')}</option>
            </select>

            <select
              className="select select-bordered w-full"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setCurrentPage(0);
              }}
            >
              <option value="">{t('erp.auditLogs.allActions')}</option>
              <option value="CREATE">{t('erp.auditLogs.actionCreate')}</option>
              <option value="UPDATE">{t('erp.auditLogs.actionUpdate')}</option>
              <option value="DELETE">{t('erp.auditLogs.actionDelete')}</option>
            </select>

            {(entityTypeFilter || actionFilter || searchQuery) && (
              <Button variant="ghost" onClick={resetFilters}>
                {t('common.clear')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Audit Logs Content */}
      <div className="relative">
        <LoadingOverlay show={refreshing} message={t('erp.auditLogs.refreshing')} />

        {/* Grouped View */}
        {viewMode === 'grouped' && (
          <>
            {auditLogGroups.length > 0 ? (
              <>
                {/* Desktop table */}
                <div className="hidden md:block surface-card overflow-x-auto">
                  <table className="table w-full">
                    <thead className="bg-base-200">
                      <tr>
                        <th className="w-12"></th>
                        <th className="text-left max-w-[280px]">{t('erp.auditLogs.colOperation')}</th>
                        <th className="text-left">{t('erp.auditLogs.colEntities')}</th>
                        <th className="text-left">{t('erp.auditLogs.colLogs')}</th>
                        <th className="text-left">{t('erp.auditLogs.colTime')}</th>
                        <th className="text-left">{t('erp.auditLogs.colUser')}</th>
                        <th className="text-left">{t('erp.auditLogs.colIpAddress')}</th>
                        <th className="text-right w-28"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogGroups.map((group) => (
                        <AuditLogGroupRow key={group.groupKey} group={group} />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card list */}
                <div className="md:hidden space-y-3">
                  {auditLogGroups.map((group) => (
                    <AuditLogGroupCard key={group.groupKey} group={group} />
                  ))}
                </div>
              </>
            ) : (
              <div className="surface-card p-8 sm:p-12 text-center">
                <Shield className="h-12 w-12 mx-auto text-base-content/30 mb-4" />
                <p className="text-sm sm:text-base text-base-content/60">
                  {entityTypeFilter || actionFilter || searchQuery
                    ? t('erp.auditLogs.emptyFiltered')
                    : t('erp.auditLogs.emptyTitle')}
                </p>
              </div>
            )}
          </>
        )}

        {/* Simple View */}
        {viewMode === 'simple' && (
          <>
            {auditLogs.length > 0 ? (
              <>
                {/* Desktop table */}
                <div className="hidden md:block surface-card overflow-x-auto">
                  <table className="table w-full">
                    <thead className="bg-base-200">
                      <tr>
                        <th className="w-12"></th>
                        <th className="text-left">{t('erp.auditLogs.colId')}</th>
                        <th className="text-left">{t('erp.auditLogs.colEntity')}</th>
                        <th className="text-left">{t('erp.auditLogs.colAction')}</th>
                        <th className="text-left">{t('erp.auditLogs.colTime')}</th>
                        <th className="text-left">{t('erp.auditLogs.colUser')}</th>
                        <th className="text-left">{t('erp.auditLogs.colIpAddress')}</th>
                        <th className="text-left w-28"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <AuditLogExpandableRow
                          key={log.id}
                          log={log}
                          isExpanded={expandedRows.has(log.id)}
                          onToggle={() => handleToggleExpand(log.id)}
                          fieldChanges={fieldChangesCache.get(log.id)}
                          onLoadDetail={() => handleLoadDetail(log.id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card list */}
                <div className="md:hidden space-y-3">
                  {auditLogs.map((log) => (
                    <AuditLogMobileCard
                      key={log.id}
                      log={log}
                      isExpanded={expandedRows.has(log.id)}
                      onToggle={() => handleToggleExpand(log.id)}
                      fieldChanges={fieldChangesCache.get(log.id)}
                      onLoadDetail={() => handleLoadDetail(log.id)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="surface-card p-8 sm:p-12 text-center">
                <Shield className="h-12 w-12 mx-auto text-base-content/30 mb-4" />
                <p className="text-sm sm:text-base text-base-content/60">
                  {entityTypeFilter || actionFilter || searchQuery
                    ? t('erp.auditLogs.emptyFiltered')
                    : t('erp.auditLogs.emptyTitle')}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex justify-center items-center gap-3 sm:gap-4">
            <Button
              variant="default"
              size="md"
              className="sm:btn-sm min-h-[44px] sm:min-h-0"
              onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
              disabled={currentPage === 0 || refreshing}
            >
              {t('erp.auditLogs.prevPage')}
            </Button>
            <span className="flex items-center px-3 sm:px-4 text-base sm:text-sm font-medium">
              {currentPage + 1} / {totalPages}
            </span>
            <Button
              variant="default"
              size="md"
              className="sm:btn-sm min-h-[44px] sm:min-h-0"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage >= totalPages - 1 || refreshing}
            >
              {t('erp.auditLogs.nextPage')}
            </Button>
          </div>
          <span className="text-xs text-base-content/50">
            {viewMode === 'grouped'
              ? t('erp.auditLogs.groupCountSummary', { total: totalElements, count: auditLogGroups.length })
              : t('erp.auditLogs.logCountSummary', { total: totalElements, count: auditLogs.length })}
          </span>
        </div>
      )}
    </div>
  );
}

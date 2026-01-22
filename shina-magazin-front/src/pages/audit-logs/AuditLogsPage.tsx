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
import { auditLogsApi, type AuditLog } from '../../api/audit-logs.api';
import type { FieldChange, AuditLogGroup } from '../../types';
import { useDataRefresh } from '../../hooks/useDataRefresh';
import { RefreshButton } from '../../components/common/RefreshButton';
import { ExportButtons } from '../../components/common/ExportButtons';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import { AuditLogExpandableRow } from '../../components/audit-logs/AuditLogExpandableRow';
import { AuditLogMobileCard } from '../../components/audit-logs/AuditLogMobileCard';
import { AuditLogGroupCard, AuditLogGroupRow } from '../../components/audit-logs/AuditLogGroupCard';

type ViewMode = 'grouped' | 'simple';

export function AuditLogsPage() {
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
    onError: () => toast.error('Audit loglarni yuklashda xatolik'),
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
      toast.success(`${format === 'excel' ? 'Excel' : 'PDF'} fayli yuklab olindi`);
    } catch {
      toast.error('Eksport qilishda xatolik');
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
      toast.error('Batafsil ma\'lumotlarni yuklashda xatolik');
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
            Audit Loglar
          </h1>
          <p className="text-sm text-base-content/60 mt-1">
            Tizimdagi barcha o'zgarishlar tarixi
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {/* View mode toggle */}
          <div className="join">
            <button
              className={`join-item btn btn-sm min-h-[36px] gap-1.5 ${
                viewMode === 'grouped' ? 'btn-primary' : 'btn-ghost'
              }`}
              onClick={() => handleViewModeChange('grouped')}
              title="Guruhlangan ko'rinish"
            >
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Guruhlangan</span>
            </button>
            <button
              className={`join-item btn btn-sm min-h-[36px] gap-1.5 ${
                viewMode === 'simple' ? 'btn-primary' : 'btn-ghost'
              }`}
              onClick={() => handleViewModeChange('simple')}
              title="Oddiy ko'rinish"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Oddiy</span>
            </button>
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
              placeholder="Username yoki IP manzil bo'yicha qidirish..."
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
          <button
            className="btn btn-primary w-full sm:w-auto min-h-[44px] gap-2"
            onClick={handleSearch}
            disabled={refreshing}
          >
            <Search className="h-5 w-5 sm:h-4 sm:w-4" />
            <span>Qidirish</span>
          </button>
        </div>

        {/* Filters */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-base-content/60" />
            <span className="text-sm font-medium">Filtrlar</span>
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
              <option value="">Barcha obyektlar</option>
              <option value="Product">Mahsulotlar</option>
              <option value="Sale">Sotuvlar</option>
              <option value="Customer">Mijozlar</option>
              <option value="PurchaseOrder">Xaridlar</option>
              <option value="Payment">To'lovlar</option>
              <option value="User">Foydalanuvchilar</option>
              <option value="Employee">Xodimlar</option>
              <option value="Role">Rollar</option>
              <option value="Supplier">Ta'minotchilar</option>
              <option value="Brand">Brendlar</option>
              <option value="Category">Kategoriyalar</option>
            </select>

            <select
              className="select select-bordered w-full"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setCurrentPage(0);
              }}
            >
              <option value="">Barcha harakatlar</option>
              <option value="CREATE">Yaratildi</option>
              <option value="UPDATE">O'zgartirildi</option>
              <option value="DELETE">O'chirildi</option>
            </select>

            {(entityTypeFilter || actionFilter || searchQuery) && (
              <button className="btn btn-ghost" onClick={resetFilters}>
                Tozalash
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Audit Logs Content */}
      <div className="relative">
        <LoadingOverlay show={refreshing} message="Audit loglar yangilanmoqda..." />

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
                        <th className="text-left max-w-[280px]">Operatsiya</th>
                        <th className="text-left">Obyektlar</th>
                        <th className="text-left">Loglar</th>
                        <th className="text-left">Vaqt</th>
                        <th className="text-left">Foydalanuvchi</th>
                        <th className="text-left">IP Manzil</th>
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
                    ? "Tanlangan filtrlar bo'yicha audit loglar topilmadi"
                    : "Hali hech qanday audit log yo'q"}
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
                        <th className="text-left">ID</th>
                        <th className="text-left">Obyekt</th>
                        <th className="text-left">Amal</th>
                        <th className="text-left">Vaqt</th>
                        <th className="text-left">Foydalanuvchi</th>
                        <th className="text-left">IP Manzil</th>
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
                    ? "Tanlangan filtrlar bo'yicha audit loglar topilmadi"
                    : "Hali hech qanday audit log yo'q"}
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
            <button
              className="btn btn-md sm:btn-sm min-h-[44px] sm:min-h-0"
              onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
              disabled={currentPage === 0 || refreshing}
            >
              Oldingi
            </button>
            <span className="flex items-center px-3 sm:px-4 text-base sm:text-sm font-medium">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              className="btn btn-md sm:btn-sm min-h-[44px] sm:min-h-0"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage >= totalPages - 1 || refreshing}
            >
              Keyingi
            </button>
          </div>
          <span className="text-xs text-base-content/50">
            {viewMode === 'grouped'
              ? `Jami ${totalElements} ta guruh, sahifada ${auditLogGroups.length} ta`
              : `Jami ${totalElements} ta log, sahifada ${auditLogs.length} ta`}
          </span>
        </div>
      )}
    </div>
  );
}

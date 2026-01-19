import { useState, useEffect } from 'react';
import {
  Shield,
  Loader2,
  RefreshCw,
  Filter,
  Search,
  Calendar,
  Trash2,
  Edit,
  Plus,
  FileSpreadsheet,
  FileDown,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { auditLogsApi, type AuditLog } from '../../api/audit-logs.api';
import { formatDistanceToNow } from 'date-fns';
import { uz } from 'date-fns/locale';
import clsx from 'clsx';

export function AuditLogsPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    fetchAuditLogs();
  }, [currentPage, entityTypeFilter, actionFilter, searchQuery]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
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
    } catch (error) {
      toast.error('Audit loglarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

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

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      await auditLogsApi.exportAuditLogs(format, {
        entityType: entityTypeFilter || undefined,
        action: actionFilter || undefined,
        search: searchQuery || undefined,
      });
      toast.success(`${format === 'excel' ? 'Excel' : 'PDF'} fayli yuklab olindi`);
    } catch (error) {
      toast.error('Eksport qilishda xatolik');
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <Plus className="h-4 w-4" />;
      case 'UPDATE':
        return <Edit className="h-4 w-4" />;
      case 'DELETE':
        return <Trash2 className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return (
          <span className="badge badge-success gap-1">
            {getActionIcon(action)}
            Yaratildi
          </span>
        );
      case 'UPDATE':
        return (
          <span className="badge badge-info gap-1">
            {getActionIcon(action)}
            O'zgartirildi
          </span>
        );
      case 'DELETE':
        return (
          <span className="badge badge-error gap-1">
            {getActionIcon(action)}
            O'chirildi
          </span>
        );
      default:
        return (
          <span className="badge badge-ghost gap-1">
            {getActionIcon(action)}
            {action}
          </span>
        );
    }
  };

  const formatTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: uz,
    });
  };

  if (loading && currentPage === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
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

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            className="btn btn-ghost btn-sm flex-1 sm:flex-none"
            onClick={fetchAuditLogs}
            disabled={loading}
            title="Yangilash"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Yangilash
          </button>

          {/* Excel Export */}
          <button
            className="btn btn-success btn-sm flex-1 sm:flex-none"
            onClick={() => handleExport('excel')}
            disabled={loading || auditLogs.length === 0}
            title="Excel formatida eksport"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </button>

          {/* PDF Export */}
          <button
            className="btn btn-error btn-sm flex-1 sm:flex-none"
            onClick={() => handleExport('pdf')}
            disabled={loading || auditLogs.length === 0}
            title="PDF formatida eksport"
          >
            <FileDown className="h-4 w-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="surface-card p-4 space-y-4">
        {/* Search Bar */}
        <div className="flex gap-2">
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
                onClick={handleClearSearch}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            className="btn btn-primary"
            onClick={handleSearch}
            disabled={loading}
          >
            <Search className="h-4 w-4" />
            Qidirish
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

      {/* Audit Logs List */}
      {auditLogs.length > 0 ? (
        <div className="space-y-3">
          {auditLogs.map((log) => (
            <div key={log.id} className="surface-card p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                <div className="flex items-start gap-3 sm:gap-4 flex-1 w-full">
                  <div
                    className={clsx(
                      'p-3 rounded-xl flex-shrink-0',
                      log.action === 'CREATE' && 'bg-success/10',
                      log.action === 'UPDATE' && 'bg-info/10',
                      log.action === 'DELETE' && 'bg-error/10',
                      !['CREATE', 'UPDATE', 'DELETE'].includes(log.action) && 'bg-base-200'
                    )}
                  >
                    {log.action === 'CREATE' && <Plus className="h-5 w-5 text-success" />}
                    {log.action === 'UPDATE' && <Edit className="h-5 w-5 text-info" />}
                    {log.action === 'DELETE' && <Trash2 className="h-5 w-5 text-error" />}
                    {!['CREATE', 'UPDATE', 'DELETE'].includes(log.action) && (
                      <Shield className="h-5 w-5 text-base-content/60" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-medium text-sm sm:text-base">
                          {log.entityType} #{log.entityId}
                        </p>
                        <p className="text-xs text-base-content/60">
                          ID: {log.id}
                        </p>
                      </div>
                      {getActionBadge(log.action)}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-base-content/60">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatTimeAgo(log.createdAt)}
                      </span>
                      {log.username && (
                        <span className="flex items-center gap-1">
                          👤 {log.username}
                        </span>
                      )}
                      {log.ipAddress && (
                        <span className="text-xs opacity-75">{log.ipAddress}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="surface-card p-8 sm:p-12 text-center">
          <Shield className="h-12 w-12 mx-auto text-base-content/30 mb-4" />
          <p className="text-sm sm:text-base text-base-content/60">
            {entityTypeFilter || actionFilter || searchQuery
              ? "Tanlangan filtrlar bo'yicha audit loglar topilmadi"
              : 'Hali hech qanday audit log yo\'q'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            className="btn btn-sm"
            onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
            disabled={currentPage === 0 || loading}
          >
            Oldingi
          </button>
          <span className="flex items-center px-4 text-sm">
            {currentPage + 1} / {totalPages}
          </span>
          <button
            className="btn btn-sm"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPage >= totalPages - 1 || loading}
          >
            Keyingi
          </button>
        </div>
      )}
    </div>
  );
}

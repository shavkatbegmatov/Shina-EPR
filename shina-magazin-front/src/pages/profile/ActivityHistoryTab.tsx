import { useState, useEffect } from 'react';
import { Activity, Loader2, Filter, Calendar, Trash2, Edit, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { usersApi, type UserActivity } from '../../api/users.api';
import { useAuthStore } from '../../store/authStore';
import { formatDistanceToNow } from 'date-fns';
import { uz } from 'date-fns/locale';
import clsx from 'clsx';
import { useDataRefresh } from '../../hooks/useDataRefresh';
import { RefreshButton } from '../../components/common/RefreshButton';
import { ExportButtons } from '../../components/common/ExportButtons';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';

export function ActivityHistoryTab() {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const { user } = useAuthStore();

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
    onError: () => toast.error('Faoliyat tarixini yuklashda xatolik'),
  });

  useEffect(() => {
    if (user?.id) {
      loadData(false);
    }
  }, [currentPage, entityTypeFilter, actionFilter, user, loadData]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <Plus className="h-4 w-4" />;
      case 'UPDATE':
        return <Edit className="h-4 w-4" />;
      case 'DELETE':
        return <Trash2 className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
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

  const getDeviceIcon = (deviceType: string) => {
    return deviceType === 'Mobile' ? '📱' : deviceType === 'Tablet' ? '📲' : '💻';
  };

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
      toast.success(`${format === 'excel' ? 'Excel' : 'PDF'} fayli yuklab olindi`);
    } catch (error) {
      toast.error('Eksport qilishda xatolik');
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
          <h3 className="text-base sm:text-lg font-semibold">Faoliyat tarixi</h3>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            Tizim ichidagi barcha harakatlaringiz tarixi
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
          <span className="text-sm font-medium">Filtrlar</span>
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
            <option value="">Barcha obyektlar</option>
            <option value="Product">Mahsulotlar</option>
            <option value="Sale">Sotuvlar</option>
            <option value="Customer">Mijozlar</option>
            <option value="PurchaseOrder">Xaridlar</option>
            <option value="Payment">To'lovlar</option>
            <option value="User">Foydalanuvchilar</option>
          </select>

          <select
            className="select select-bordered w-full select-sm"
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

          {(entityTypeFilter || actionFilter) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={resetFilters}
            >
              Tozalash
            </button>
          )}
        </div>
      </div>

      {/* Activity list */}
      <div className="relative">
        <LoadingOverlay show={refreshing} message="Faoliyat tarixi yangilanmoqda..." />
        {activities.length > 0 ? (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="surface-card p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                <div className="flex items-start gap-3 sm:gap-4 flex-1 w-full">
                  <div className={clsx(
                    'p-3 rounded-xl flex-shrink-0',
                    activity.action === 'CREATE' && 'bg-success/10',
                    activity.action === 'UPDATE' && 'bg-info/10',
                    activity.action === 'DELETE' && 'bg-error/10',
                    !['CREATE', 'UPDATE', 'DELETE'].includes(activity.action) && 'bg-base-200'
                  )}>
                    {activity.action === 'CREATE' && <Plus className="h-5 w-5 text-success" />}
                    {activity.action === 'UPDATE' && <Edit className="h-5 w-5 text-info" />}
                    {activity.action === 'DELETE' && <Trash2 className="h-5 w-5 text-error" />}
                    {!['CREATE', 'UPDATE', 'DELETE'].includes(activity.action) && (
                      <Activity className="h-5 w-5 text-base-content/60" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-medium text-sm sm:text-base break-words">
                        {activity.description}
                      </p>
                      {getActionBadge(activity.action)}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-base-content/60">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                      {activity.username && (
                        <span className="flex items-center gap-1">
                          👤 {activity.username}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        {getDeviceIcon(activity.deviceType)} {activity.deviceType}
                      </span>
                      <span>{activity.browser}</span>
                      {activity.ipAddress && (
                        <span className="text-xs opacity-75">{activity.ipAddress}</span>
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
          <Activity className="h-12 w-12 mx-auto text-base-content/30 mb-4" />
          <p className="text-sm sm:text-base text-base-content/60">
            {entityTypeFilter || actionFilter
              ? "Tanlangan filtrlar bo'yicha faoliyat topilmadi"
              : 'Hali hech qanday faoliyat yo\'q'}
          </p>
        </div>
      )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            className="btn btn-sm"
            onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
            disabled={currentPage === 0 || refreshing}
          >
            Oldingi
          </button>
          <span className="flex items-center px-4 text-sm">
            {currentPage + 1} / {totalPages}
          </span>
          <button
            className="btn btn-sm"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPage >= totalPages - 1 || refreshing}
          >
            Keyingi
          </button>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { ChevronDown, ChevronRight, Eye, Loader2, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { uz } from 'date-fns/locale';
import type { AuditLog } from '../../api/audit-logs.api';
import type { FieldChange } from '../../types';
import { AuditLogDetailModal } from './AuditLogDetailModal';

interface AuditLogMobileCardProps {
  log: AuditLog;
  isExpanded: boolean;
  onToggle: () => void;
  fieldChanges?: FieldChange[];
  onLoadDetail: () => Promise<void>;
}

export function AuditLogMobileCard({
  log,
  isExpanded,
  onToggle,
  fieldChanges,
  onLoadDetail,
}: AuditLogMobileCardProps) {
  const [loading, setLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleExpand = async () => {
    if (!isExpanded && !fieldChanges) {
      setLoading(true);
      await onLoadDetail();
      setLoading(false);
    }
    onToggle();
  };

  const formatTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: uz,
    });
  };

  const translateAction = (action: string): string => {
    switch (action) {
      case 'CREATE':
        return 'Yaratildi';
      case 'UPDATE':
        return "O'zgartirildi";
      case 'DELETE':
        return "O'chirildi";
      default:
        return action;
    }
  };

  const getActionBadgeClass = (action: string): string => {
    switch (action) {
      case 'CREATE':
        return 'badge-success';
      case 'UPDATE':
        return 'badge-info';
      case 'DELETE':
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  };

  return (
    <>
      <div className="surface-card">
        {/* Card header - touch-friendly */}
        <div className="flex items-start gap-3 p-4">
          {/* Expand button */}
          <button
            onClick={handleExpand}
            className="flex-shrink-0 mt-1 p-1 -m-1 active:bg-base-200 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-base-content/60" />
            ) : (
              <ChevronRight className="h-5 w-5 text-base-content/60" />
            )}
          </button>

          {/* Content - clickable to expand */}
          <button
            onClick={handleExpand}
            className="flex-1 min-w-0 text-left"
          >
            {/* Title and action badge */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-medium text-base">
                {log.entityType} #{log.entityId}
              </span>
              <span className={`badge badge-sm ${getActionBadgeClass(log.action)}`}>
                {translateAction(log.action)}
              </span>
            </div>

            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-base-content/60">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatTimeAgo(log.createdAt)}
              </span>
              {log.username && <span>👤 {log.username}</span>}
              {log.ipAddress && <span className="text-xs">{log.ipAddress}</span>}
            </div>
          </button>

          {/* Direct detail button */}
          <button
            onClick={() => setShowDetailModal(true)}
            className="flex-shrink-0 btn btn-ghost btn-sm btn-circle text-primary"
            title="Batafsil"
          >
            <Eye className="h-5 w-5" />
          </button>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-base-300">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4 pt-4">
                {/* Field changes - vertical stack layout */}
                {fieldChanges && fieldChanges.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-base-content/80">
                      O'zgarishlar ({fieldChanges.length})
                    </h4>
                    {fieldChanges.map((change, index) => (
                      <MobileFieldChangeRow key={index} change={change} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-base-content/60">
                    O'zgarishlar ma'lumoti mavjud emas
                  </div>
                )}

                {/* Action button - full width on mobile, touch-friendly */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDetailModal(true);
                  }}
                  className="btn btn-primary w-full min-h-[44px] gap-2"
                >
                  <Eye className="h-5 w-5" />
                  Batafsil ko'rish
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && (
        <AuditLogDetailModal logId={log.id} onClose={() => setShowDetailModal(false)} />
      )}
    </>
  );
}

// Sub-component for individual field change in mobile view
function MobileFieldChangeRow({ change }: { change: FieldChange }) {
  const translateChangeType = (changeType: string): string => {
    switch (changeType) {
      case 'ADDED':
        return "Qo'shildi";
      case 'MODIFIED':
        return "O'zgartirildi";
      case 'REMOVED':
        return "O'chirildi";
      default:
        return changeType;
    }
  };

  const getChangeTypeBadge = (changeType: string): string => {
    switch (changeType) {
      case 'ADDED':
        return 'badge-success';
      case 'MODIFIED':
        return 'badge-warning';
      case 'REMOVED':
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  };

  return (
    <div className="border-l-4 border-base-300 pl-3 py-2 bg-base-100">
      {/* Field label and badge */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm">{change.fieldLabel}</span>
        <span className={`badge badge-sm ${getChangeTypeBadge(change.changeType)}`}>
          {translateChangeType(change.changeType)}
        </span>
      </div>

      {/* Values */}
      <div className="space-y-1.5 text-sm">
        {/* Old value */}
        <div
          className={
            change.changeType === 'REMOVED'
              ? 'line-through text-error opacity-75'
              : ''
          }
        >
          <span className="text-base-content/60 text-xs">Eski: </span>
          {change.isSensitive ? (
            <span className="text-base-content/40">****** (Maxfiy)</span>
          ) : (
            <code className="bg-base-200 px-2 py-0.5 rounded text-xs break-all">
              {change.oldValueFormatted || '-'}
            </code>
          )}
        </div>

        {/* New value */}
        <div
          className={
            change.changeType === 'ADDED'
              ? 'text-success font-medium'
              : ''
          }
        >
          <span className="text-base-content/60 text-xs">Yangi: </span>
          {change.isSensitive ? (
            <span className="text-base-content/40">****** (Maxfiy)</span>
          ) : (
            <code className="bg-base-200 px-2 py-0.5 rounded text-xs break-all">
              {change.newValueFormatted || '-'}
            </code>
          )}
        </div>
      </div>
    </div>
  );
}

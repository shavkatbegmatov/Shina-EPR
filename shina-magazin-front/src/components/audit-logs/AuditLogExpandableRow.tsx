import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, Eye, Loader2, Plus, Edit, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { uz } from 'date-fns/locale';
import type { AuditLog } from '../../api/audit-logs.api';
import type { FieldChange } from '../../types';
import { AuditLogDetailModal } from './AuditLogDetailModal';

interface AuditLogExpandableRowProps {
  log: AuditLog;
  isExpanded: boolean;
  onToggle: () => void;
  fieldChanges?: FieldChange[];
  onLoadDetail: () => Promise<void>;
}

export function AuditLogExpandableRow({
  log,
  isExpanded,
  onToggle,
  fieldChanges,
  onLoadDetail,
}: AuditLogExpandableRowProps) {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleExpand = async () => {
    if (!isExpanded && !fieldChanges) {
      // Lazy load field changes when expanding for the first time
      setLoading(true);
      await onLoadDetail();
      setLoading(false);
    }
    onToggle();
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

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <Plus className="h-3 w-3" />;
      case 'UPDATE':
        return <Edit className="h-3 w-3" />;
      case 'DELETE':
        return <Trash2 className="h-3 w-3" />;
      default:
        return null;
    }
  };

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

  const formatTimestamp = (dateString: string): string => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: uz,
    });
  };

  return (
    <>
      {/* Main row */}
      <tr
        className="cursor-pointer hover:bg-base-200/50 transition-colors"
        onClick={handleExpand}
      >
        <td className="px-4 py-3">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-base-content/60" />
          ) : (
            <ChevronRight className="h-5 w-5 text-base-content/60" />
          )}
        </td>
        <td className="px-4 py-3 text-sm">#{log.id}</td>
        <td className="px-4 py-3">
          <div className="text-sm font-medium">{log.entityType}</div>
          <div className="text-xs text-base-content/60">ID: {log.entityId}</div>
        </td>
        <td className="px-4 py-3">
          <span className={`badge ${getActionBadgeClass(log.action)} gap-1`}>
            {getActionIcon(log.action)}
            {translateAction(log.action)}
          </span>
        </td>
        <td className="px-4 py-3 text-sm">{formatTimestamp(log.createdAt)}</td>
        <td className="px-4 py-3 text-sm">{log.username || '-'}</td>
        <td className="px-4 py-3 text-xs text-base-content/60">{log.ipAddress || '-'}</td>
        <td className="px-4 py-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDetailModal(true);
            }}
            className="btn btn-ghost btn-sm gap-1.5 text-primary hover:bg-primary/10"
            title="Batafsil ko'rish"
          >
            <Eye className="h-4 w-4" />
            <span className="hidden lg:inline">Batafsil</span>
          </button>
        </td>
      </tr>

      {/* Detail Modal (Layer 3) - rendered via Portal */}
      {showDetailModal && (
        <ModalPortal logId={log.id} onClose={() => setShowDetailModal(false)} />
      )}

      {/* Expanded content (Layer 2) */}
      {isExpanded && (
        <tr>
          <td colSpan={8} className="px-4 py-4 bg-base-200/30">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Field changes table */}
                {fieldChanges && fieldChanges.length > 0 ? (
                  <>
                    {/* Desktop table */}
                    <div className="hidden md:block bg-base-100 rounded-lg shadow-sm overflow-hidden">
                      <div className="px-4 py-3 bg-base-200/50 border-b border-base-300">
                        <h4 className="font-medium text-sm">O'zgarishlar</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="table table-sm w-full">
                          <thead>
                            <tr className="bg-base-200/30">
                              <th className="text-left py-2 font-medium">Maydon</th>
                              <th className="text-left py-2 font-medium">Eski qiymat</th>
                              <th className="text-center py-2 w-12">→</th>
                              <th className="text-left py-2 font-medium">Yangi qiymat</th>
                              <th className="text-center py-2 font-medium w-32">Holat</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fieldChanges.map((change, index) => (
                              <tr key={index} className="border-b border-base-300 last:border-0">
                                <td className="py-2 font-medium text-sm">{change.fieldLabel}</td>
                                <td
                                  className={`py-2 text-sm ${
                                    change.changeType === 'REMOVED'
                                      ? 'line-through text-error'
                                      : ''
                                  }`}
                                >
                                  {change.isSensitive ? (
                                    <span className="text-base-content/40">****** (Maxfiy)</span>
                                  ) : (
                                    <code className="bg-base-200 px-2 py-0.5 rounded text-xs">
                                      {change.oldValueFormatted || '-'}
                                    </code>
                                  )}
                                </td>
                                <td className="py-2 text-center text-base-content/40">→</td>
                                <td
                                  className={`py-2 text-sm ${
                                    change.changeType === 'ADDED'
                                      ? 'text-success font-medium'
                                      : ''
                                  }`}
                                >
                                  {change.isSensitive ? (
                                    <span className="text-base-content/40">****** (Maxfiy)</span>
                                  ) : (
                                    <code className="bg-base-200 px-2 py-0.5 rounded text-xs">
                                      {change.newValueFormatted || '-'}
                                    </code>
                                  )}
                                </td>
                                <td className="py-2 text-center">
                                  <span className={`badge badge-sm ${getChangeTypeBadge(change.changeType)}`}>
                                    {translateChangeType(change.changeType)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Mobile card view */}
                    <div className="md:hidden bg-base-100 rounded-lg shadow-sm overflow-hidden">
                      <div className="px-3 py-2 bg-base-200/50 border-b border-base-300">
                        <h4 className="font-medium text-sm">O'zgarishlar ({fieldChanges.length})</h4>
                      </div>
                      <div className="p-3 space-y-3">
                        {fieldChanges.map((change, index) => (
                          <div key={index} className="border-l-4 border-base-300 pl-3 py-2 bg-base-50">
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
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-base-100 rounded-lg p-6 text-center text-sm text-base-content/60">
                    O'zgarishlar ma'lumoti mavjud emas
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDetailModal(true);
                    }}
                    className="btn btn-primary w-full sm:w-auto min-h-[44px] sm:min-h-0 gap-2"
                  >
                    <Eye className="h-5 w-5 sm:h-4 sm:w-4" />
                    Batafsil ko'rish
                  </button>

                  {/* Entity link placeholder - will be added when we have entity links */}
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// Render modal outside tbody using Portal
function ModalPortal({ logId, onClose }: { logId: number; onClose: () => void }) {
  return createPortal(
    <AuditLogDetailModal logId={logId} onClose={onClose} />,
    document.body
  );
}

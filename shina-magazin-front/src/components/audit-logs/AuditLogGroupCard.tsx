import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  ChevronRight,
  Eye,
  Plus,
  Edit,
  Trash2,
  Layers,
  User,
  Globe,
  FileSearch,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { uz } from 'date-fns/locale';
import type { AuditLogGroup, AuditLog } from '../../types';
import { Button } from '@/ui';
import { AuditLogDetailModal } from './AuditLogDetailModal';
import { AuditLogGroupDetailModal } from './AuditLogGroupDetailModal';
import { extractGroupDetail } from '../../utils/audit-log-extractors';

interface AuditLogGroupCardProps {
  group: AuditLogGroup;
}

export function AuditLogGroupCard({ group }: AuditLogGroupCardProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [showGroupDetailModal, setShowGroupDetailModal] = useState(false);

  const formatTimestamp = (dateString: string): string => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: uz,
    });
  };

  const translateAction = (action: string): string => {
    switch (action) {
      case 'CREATE':
        return t('erp.auditGroup.actionCreate');
      case 'UPDATE':
        return t('erp.auditGroup.actionUpdate');
      case 'DELETE':
        return t('erp.auditGroup.actionDelete');
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

  const getEntityTypeLabel = (entityType: string): string => {
    switch (entityType) {
      case 'Product':
        return t('erp.auditGroup.entityProduct');
      case 'Sale':
        return t('erp.auditGroup.entitySale');
      case 'Customer':
        return t('erp.auditGroup.entityCustomer');
      case 'Payment':
        return t('erp.auditGroup.entityPayment');
      case 'Debt':
        return t('erp.auditGroup.entityDebt');
      case 'PurchaseOrder':
        return t('erp.auditGroup.entityPurchaseOrder');
      case 'PurchasePayment':
        return t('erp.auditGroup.entityPurchasePayment');
      case 'PurchaseReturn':
        return t('erp.auditGroup.entityPurchaseReturn');
      case 'Supplier':
        return t('erp.auditGroup.entitySupplier');
      case 'Employee':
        return t('erp.auditGroup.entityEmployee');
      case 'User':
        return t('erp.auditGroup.entityUser');
      case 'Role':
        return t('erp.auditGroup.entityRole');
      case 'Brand':
        return t('erp.auditGroup.entityBrand');
      case 'Category':
        return t('erp.auditGroup.entityCategory');
      case 'StockMovement':
        return t('erp.auditGroup.entityStockMovement');
      default:
        return entityType;
    }
  };

  const handleShowDetail = (logId: number) => {
    setSelectedLogId(logId);
    setShowDetailModal(true);
  };

  const renderLogItem = (log: AuditLog, index: number) => (
    <div
      key={log.id}
      className="flex items-center justify-between py-3 px-4 border-b border-base-200 last:border-0 hover:bg-base-100/50 transition-colors"
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span className="text-base-content/40 text-sm font-mono w-6 flex-shrink-0">
          {index + 1}.
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{getEntityTypeLabel(log.entityType)}</span>
            <span className={`badge badge-sm ${getActionBadgeClass(log.action)} gap-1`}>
              {getActionIcon(log.action)}
              {translateAction(log.action)}
            </span>
            <span className="text-xs text-base-content/50">(ID: {log.entityId})</span>
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          handleShowDetail(log.id);
        }}
        className="gap-1 text-primary hover:bg-primary/10 flex-shrink-0"
        title={t('erp.auditGroup.viewDetail')}
      >
        <Eye className="h-4 w-4" />
        <span className="hidden sm:inline">{t('erp.auditGroup.detail')}</span>
      </Button>
    </div>
  );

  return (
    <>
      {/* Group Card */}
      <div className="surface-card overflow-hidden">
        {/* Header - clickable to expand */}
        <div
          className="p-4 cursor-pointer hover:bg-base-200/30 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-start gap-3">
            {/* Expand/collapse icon */}
            <div className="flex-shrink-0 mt-0.5">
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-base-content/60" />
              ) : (
                <ChevronRight className="h-5 w-5 text-base-content/60" />
              )}
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Primary action and timestamp */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-semibold text-base">{group.primaryAction}</h3>
                <span className="text-sm text-base-content/60 flex-shrink-0">
                  {formatTimestamp(group.timestamp)}
                </span>
              </div>

              {/* Summary */}
              <p className="text-sm text-base-content/70 mb-2">{group.summary}</p>

              {/* Meta info */}
              <div className="flex items-center gap-4 text-xs text-base-content/50 flex-wrap">
                {group.username && (
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {group.username}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5" />
                  {t('erp.auditGroup.logCount', { n: group.logCount })}
                </span>
                {group.logs[0]?.ipAddress && (
                  <span className="flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" />
                    {group.logs[0].ipAddress}
                  </span>
                )}
              </div>

              {/* Entity type badges and action button */}
              <div className="flex items-center justify-between gap-3 mt-2">
                <div className="flex flex-wrap gap-1.5">
                  {group.entityTypes.map((entityType) => (
                    <span key={entityType} className="badge badge-sm badge-outline">
                      {getEntityTypeLabel(entityType)}
                    </span>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowGroupDetailModal(true);
                  }}
                  className="h-auto min-h-[2rem] py-1 gap-1.5 text-primary hover:bg-primary/10 flex-shrink-0"
                  title={t('erp.auditGroup.groupDetail')}
                >
                  <FileSearch className="h-4 w-4 flex-shrink-0" />
                  {t('erp.auditGroup.detail')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Expanded content - individual logs */}
        {isExpanded && (
          <div className="border-t border-base-200 bg-base-100/50">
            <div className="px-4 py-2 bg-base-200/50 border-b border-base-200">
              <h4 className="text-sm font-medium text-base-content/70">
                {t('erp.auditGroup.logsInGroup', { n: group.logCount })}
              </h4>
            </div>
            <div className="divide-y divide-base-200">
              {group.logs.map((log, index) => renderLogItem(log, index))}
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedLogId !== null && (
        createPortal(
          <AuditLogDetailModal
            logId={selectedLogId}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedLogId(null);
            }}
          />,
          document.body
        )
      )}

      {/* Group Detail Modal */}
      {showGroupDetailModal && (
        createPortal(
          <AuditLogGroupDetailModal
            detail={extractGroupDetail(group)}
            onClose={() => setShowGroupDetailModal(false)}
          />,
          document.body
        )
      )}
    </>
  );
}

// Desktop table row version for grouped view
interface AuditLogGroupRowProps {
  group: AuditLogGroup;
}

export function AuditLogGroupRow({ group }: AuditLogGroupRowProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [showGroupDetailModal, setShowGroupDetailModal] = useState(false);

  const formatTimestamp = (dateString: string): string => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: uz,
    });
  };

  const translateAction = (action: string): string => {
    switch (action) {
      case 'CREATE':
        return t('erp.auditGroup.actionCreate');
      case 'UPDATE':
        return t('erp.auditGroup.actionUpdate');
      case 'DELETE':
        return t('erp.auditGroup.actionDelete');
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

  const getEntityTypeLabel = (entityType: string): string => {
    switch (entityType) {
      case 'Product':
        return t('erp.auditGroup.entityProduct');
      case 'Sale':
        return t('erp.auditGroup.entitySale');
      case 'Customer':
        return t('erp.auditGroup.entityCustomer');
      case 'Payment':
        return t('erp.auditGroup.entityPayment');
      case 'Debt':
        return t('erp.auditGroup.entityDebt');
      case 'PurchaseOrder':
        return t('erp.auditGroup.entityPurchaseOrder');
      case 'PurchasePayment':
        return t('erp.auditGroup.entityPurchasePayment');
      case 'PurchaseReturn':
        return t('erp.auditGroup.entityPurchaseReturn');
      case 'Supplier':
        return t('erp.auditGroup.entitySupplier');
      case 'Employee':
        return t('erp.auditGroup.entityEmployee');
      case 'User':
        return t('erp.auditGroup.entityUser');
      case 'Role':
        return t('erp.auditGroup.entityRole');
      case 'Brand':
        return t('erp.auditGroup.entityBrand');
      case 'Category':
        return t('erp.auditGroup.entityCategory');
      case 'StockMovement':
        return t('erp.auditGroup.entityStockMovement');
      default:
        return entityType;
    }
  };

  const handleShowDetail = (logId: number) => {
    setSelectedLogId(logId);
    setShowDetailModal(true);
  };

  return (
    <>
      {/* Main row */}
      <tr
        className="cursor-pointer hover:bg-base-200/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <td className="px-4 py-3">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-base-content/60" />
          ) : (
            <ChevronRight className="h-5 w-5 text-base-content/60" />
          )}
        </td>
        <td className="px-4 py-3 max-w-[280px]">
          <div className="font-medium text-sm truncate" title={group.primaryAction}>{group.primaryAction}</div>
          <div className="text-xs text-base-content/60 mt-0.5 truncate" title={group.summary}>{group.summary}</div>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {group.entityTypes.slice(0, 3).map((entityType) => (
              <span key={entityType} className="badge badge-sm badge-outline">
                {getEntityTypeLabel(entityType)}
              </span>
            ))}
            {group.entityTypes.length > 3 && (
              <span className="badge badge-sm badge-ghost">
                +{group.entityTypes.length - 3}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="badge badge-sm badge-primary">{t('erp.auditGroup.logCount', { n: group.logCount })}</span>
        </td>
        <td className="px-4 py-3 text-sm">{formatTimestamp(group.timestamp)}</td>
        <td className="px-4 py-3 text-sm">{group.username || '-'}</td>
        <td className="px-4 py-3 text-xs text-base-content/60">
          {group.logs[0]?.ipAddress || '-'}
        </td>
        <td className="px-4 py-3 text-right">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowGroupDetailModal(true);
            }}
            className="h-auto min-h-[2rem] py-1 gap-1.5 text-primary hover:bg-primary/10"
            title={t('erp.auditGroup.groupDetail')}
          >
            <FileSearch className="h-4 w-4 flex-shrink-0" />
            {t('erp.auditGroup.detail')}
          </Button>
        </td>
      </tr>

      {/* Expanded content */}
      {isExpanded && (
        <tr>
          <td colSpan={8} className="px-4 py-4 bg-base-200/30">
            <div className="bg-base-100 rounded-lg shadow-sm overflow-hidden">
              <div className="px-4 py-2 bg-base-200/50 border-b border-base-300">
                <h4 className="font-medium text-sm">{t('erp.auditGroup.logsInGroup', { n: group.logCount })}</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="table table-sm w-full">
                  <thead>
                    <tr className="bg-base-200/30">
                      <th className="text-left py-2 w-12">#</th>
                      <th className="text-left py-2">{t('erp.auditGroup.colObject')}</th>
                      <th className="text-left py-2">{t('erp.auditGroup.colAction')}</th>
                      <th className="text-left py-2">ID</th>
                      <th className="text-right py-2 w-28"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.logs.map((log, index) => (
                      <tr key={log.id} className="border-b border-base-300 last:border-0 hover:bg-base-100">
                        <td className="py-2 text-base-content/50">{index + 1}</td>
                        <td className="py-2 font-medium text-sm">{getEntityTypeLabel(log.entityType)}</td>
                        <td className="py-2">
                          <span className={`badge badge-sm ${getActionBadgeClass(log.action)} gap-1`}>
                            {getActionIcon(log.action)}
                            {translateAction(log.action)}
                          </span>
                        </td>
                        <td className="py-2 text-xs text-base-content/60">{log.entityId}</td>
                        <td className="py-2 text-right">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowDetail(log.id);
                            }}
                            className="gap-1 text-primary hover:bg-primary/10"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            {t('erp.auditGroup.detail')}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </td>
        </tr>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedLogId !== null && (
        createPortal(
          <AuditLogDetailModal
            logId={selectedLogId}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedLogId(null);
            }}
          />,
          document.body
        )
      )}

      {/* Group Detail Modal */}
      {showGroupDetailModal && (
        createPortal(
          <AuditLogGroupDetailModal
            detail={extractGroupDetail(group)}
            onClose={() => setShowGroupDetailModal(false)}
          />,
          document.body
        )
      )}
    </>
  );
}

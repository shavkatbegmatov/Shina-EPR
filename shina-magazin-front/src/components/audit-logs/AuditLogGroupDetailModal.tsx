import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronDown, ChevronRight, ExternalLink, User } from 'lucide-react';
import { Button, buttonVariants } from '@/ui';
import type { AuditLogGroupDetail, AuditLog } from '../../types';

interface AuditLogGroupDetailModalProps {
  detail: AuditLogGroupDetail;
  onClose: () => void;
}

export function AuditLogGroupDetailModal({ detail, onClose }: AuditLogGroupDetailModalProps) {
  const { t } = useTranslation();
  const [showTechnicalLogs, setShowTechnicalLogs] = useState(false);

  const translateAction = (action: string): string => {
    switch (action) {
      case 'CREATE':
        return t('erp.auditGroupDetail.actionCreate');
      case 'UPDATE':
        return t('erp.auditGroupDetail.actionUpdate');
      case 'DELETE':
        return t('erp.auditGroupDetail.actionDelete');
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

  const getEntityTypeLabel = (entityType: string): string => {
    switch (entityType) {
      case 'Product':
        return t('erp.auditGroupDetail.entityProduct');
      case 'Sale':
        return t('erp.auditGroupDetail.entitySale');
      case 'SaleItem':
        return t('erp.auditGroupDetail.entitySaleItem');
      case 'Customer':
        return t('erp.auditGroupDetail.entityCustomer');
      case 'Payment':
        return t('erp.auditGroupDetail.entityPayment');
      case 'Debt':
        return t('erp.auditGroupDetail.entityDebt');
      case 'PurchaseOrder':
        return t('erp.auditGroupDetail.entityPurchaseOrder');
      case 'PurchasePayment':
        return t('erp.auditGroupDetail.entityPurchasePayment');
      case 'PurchaseReturn':
        return t('erp.auditGroupDetail.entityPurchaseReturn');
      case 'Supplier':
        return t('erp.auditGroupDetail.entitySupplier');
      case 'Employee':
        return t('erp.auditGroupDetail.entityEmployee');
      case 'User':
        return t('erp.auditGroupDetail.entityUser');
      case 'Role':
        return t('erp.auditGroupDetail.entityRole');
      case 'Brand':
        return t('erp.auditGroupDetail.entityBrand');
      case 'Category':
        return t('erp.auditGroupDetail.entityCategory');
      case 'StockMovement':
        return t('erp.auditGroupDetail.entityStockMovement');
      default:
        return entityType;
    }
  };

  const renderLogItem = (log: AuditLog, index: number) => (
    <div
      key={log.id}
      className="flex items-center justify-between py-2 px-3 border-b border-base-200 last:border-0 text-sm"
    >
      <div className="flex items-center gap-2">
        <span className="text-base-content/40 font-mono w-5">{index + 1}.</span>
        <span className="font-medium">{getEntityTypeLabel(log.entityType)}</span>
        <span className={`badge badge-xs ${getActionBadgeClass(log.action)}`}>
          {translateAction(log.action)}
        </span>
        <span className="text-xs text-base-content/50">(ID: {log.entityId})</span>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-0 md:p-4"
      onClick={onClose}
    >
      <div
        className="bg-base-100 w-full h-full md:h-auto md:max-h-[90vh] md:rounded-lg shadow-xl md:max-w-lg flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-base-300 flex items-start justify-between flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg md:text-xl font-bold">{detail.operationLabel}</h2>
            <p className="text-sm text-base-content/60 mt-1 flex items-center gap-2">
              <span>📅 {detail.timestamp}</span>
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="btn-circle flex-shrink-0 ml-2 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0">
          {/* Details list */}
          <div className="space-y-4">
            {detail.details.map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                {item.icon && (
                  <span className="text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
                )}
                <div className="flex-1 min-w-0">
                  <label className="text-sm text-base-content/60">{item.label}</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.changeType && item.oldValue ? (
                      <>
                        <span className="text-base-content/50 line-through">{item.oldValue}</span>
                        <span className="text-base-content/40">→</span>
                        <span className={`font-medium ${
                          item.changeType === 'ADDED' ? 'text-success' :
                          item.changeType === 'REMOVED' ? 'text-error' : ''
                        }`}>
                          {item.value}
                        </span>
                      </>
                    ) : (
                      <span className="font-medium">{item.value}</span>
                    )}
                    {item.link && (
                      <a
                        href={item.link}
                        onClick={onClose}
                        className={buttonVariants({ variant: 'ghost', size: 'xs', className: 'gap-1 text-primary hover:bg-primary/10' })}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Operator */}
            <div className="flex items-start gap-3 pt-2 border-t border-base-200">
              <span className="text-lg flex-shrink-0 mt-0.5">👨‍💼</span>
              <div className="flex-1 min-w-0">
                <label className="text-sm text-base-content/60">{t('erp.auditGroupDetail.operator')}</label>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{detail.operatorUsername}</span>
                  {detail.operatorLink && (
                    <a
                      href={detail.operatorLink}
                      onClick={onClose}
                      className={buttonVariants({ variant: 'ghost', size: 'xs', className: 'gap-1 text-primary hover:bg-primary/10' })}
                    >
                      <User className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Technical logs section */}
          <div className="mt-6 border-t border-base-200 pt-4">
            <button
              onClick={() => setShowTechnicalLogs(!showTechnicalLogs)}
              className="flex items-center gap-2 text-sm font-medium text-base-content/70 hover:text-base-content w-full"
            >
              {showTechnicalLogs ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {t('erp.auditGroupDetail.technicalLogs', { count: detail.logs.length })}
            </button>

            {showTechnicalLogs && (
              <div className="mt-3 bg-base-200/50 rounded-lg overflow-hidden">
                {detail.logs.map((log, index) => renderLogItem(log, index))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-t border-base-300 flex justify-end flex-shrink-0">
          <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto min-h-[44px]">
            {t('common.close')}
          </Button>
        </div>
      </div>
    </div>
  );
}

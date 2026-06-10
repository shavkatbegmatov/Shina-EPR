import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Copy, ExternalLink, Loader2, Check, FileEdit, Code, Info, User } from 'lucide-react';
import { format } from 'date-fns';
import { uz } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { auditLogsApi } from '../../api/audit-logs.api';
import type { AuditLogDetailResponse } from '../../types';
import { JsonDiffViewer } from './JsonDiffViewer';
import { Button, buttonVariants } from '@/ui';

interface AuditLogDetailModalProps {
  logId: number;
  onClose: () => void;
}

type TabType = 'changes' | 'json' | 'meta';

export function AuditLogDetailModal({ logId, onClose }: AuditLogDetailModalProps) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<AuditLogDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('changes');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    loadDetail();
  }, [logId]);

  const loadDetail = async () => {
    try {
      setLoading(true);
      const data = await auditLogsApi.getDetail(logId);
      setDetail(data);
    } catch (error) {
      console.error('Failed to load audit log detail:', error);
      toast.error(t('erp.auditDetail.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const translateAction = (action: string): string => {
    switch (action) {
      case 'CREATE':
        return t('erp.auditDetail.actionCreate');
      case 'UPDATE':
        return t('erp.auditDetail.actionUpdate');
      case 'DELETE':
        return t('erp.auditDetail.actionDelete');
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

  const translateChangeType = (changeType: string): string => {
    switch (changeType) {
      case 'ADDED':
        return t('erp.auditDetail.changeAdded');
      case 'MODIFIED':
        return t('erp.auditDetail.changeModified');
      case 'REMOVED':
        return t('erp.auditDetail.changeRemoved');
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
    try {
      return format(new Date(dateString), "dd.MM.yyyy HH:mm:ss", { locale: uz });
    } catch {
      return dateString;
    }
  };

  const formatFullTimestamp = (dateString: string): string => {
    try {
      return format(new Date(dateString), "PPpp", { locale: uz });
    } catch {
      return dateString;
    }
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
      toast.success(t('erp.auditDetail.copied'));
    } catch {
      toast.error(t('erp.auditDetail.copyError'));
    }
  };

  const getDeviceEmoji = (deviceType: string): string => {
    const lowerType = deviceType.toLowerCase();
    if (lowerType.includes('mobile')) return '📱';
    if (lowerType.includes('tablet')) return '📱';
    if (lowerType.includes('desktop')) return '💻';
    return '🖥️';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
        <div className="bg-base-100 rounded-lg shadow-xl p-8" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (!detail) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-0 md:p-4" onClick={onClose}>
      <div
        className="bg-base-100 w-full h-full md:h-[90vh] md:rounded-lg shadow-xl md:max-w-4xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-base-300 flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg md:text-xl font-bold">{t('erp.auditDetail.title')}</h2>
            <p className="text-xs md:text-sm text-base-content/60 mt-1">
              {detail.entityType} #{detail.entityId} -{' '}
              <span className={`badge badge-sm ${getActionBadgeClass(detail.action)}`}>
                {translateAction(detail.action)}
              </span>
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

        {/* Tabs */}
        <div className="border-b-2 border-base-300 bg-base-100">
          <div className="flex gap-1 px-3 md:px-6 overflow-x-auto">
            <button
              className={`
                relative
                min-h-[48px] px-4 md:px-5 py-3
                flex items-center gap-2
                font-semibold text-sm md:text-base
                whitespace-nowrap
                transition-all duration-200
                rounded-t-lg
                ${
                  activeTab === 'changes'
                    ? 'text-primary bg-primary/10'
                    : 'text-base-content/60 hover:text-base-content hover:bg-base-200/50'
                }
              `}
              onClick={() => setActiveTab('changes')}
            >
              <FileEdit className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
              <span>{t('erp.auditDetail.tabChanges')}</span>
              {detail?.fieldChanges && detail.fieldChanges.length > 0 && (
                <span className={`
                  badge badge-sm ml-1
                  ${activeTab === 'changes' ? 'badge-primary' : 'badge-ghost'}
                `}>
                  {detail.fieldChanges.length}
                </span>
              )}
              {activeTab === 'changes' && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-t-sm"></div>
              )}
            </button>
            <button
              className={`
                relative
                min-h-[48px] px-4 md:px-5 py-3
                flex items-center gap-2
                font-semibold text-sm md:text-base
                whitespace-nowrap
                transition-all duration-200
                rounded-t-lg
                ${
                  activeTab === 'json'
                    ? 'text-primary bg-primary/10'
                    : 'text-base-content/60 hover:text-base-content hover:bg-base-200/50'
                }
              `}
              onClick={() => setActiveTab('json')}
            >
              <Code className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
              <span>{t('erp.auditDetail.tabJson')}</span>
              {activeTab === 'json' && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-t-sm"></div>
              )}
            </button>
            <button
              className={`
                relative
                min-h-[48px] px-4 md:px-5 py-3
                flex items-center gap-2
                font-semibold text-sm md:text-base
                whitespace-nowrap
                transition-all duration-200
                rounded-t-lg
                ${
                  activeTab === 'meta'
                    ? 'text-primary bg-primary/10'
                    : 'text-base-content/60 hover:text-base-content hover:bg-base-200/50'
                }
              `}
              onClick={() => setActiveTab('meta')}
            >
              <Info className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
              <span>{t('erp.auditDetail.tabMeta')}</span>
              {activeTab === 'meta' && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-t-sm"></div>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0">
          {/* Changes Tab */}
          {activeTab === 'changes' && (
            <div className="space-y-4">
              {/* Summary Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-base-200 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-base-content/60">{t('erp.auditDetail.user')}</label>
                  <p className="font-medium">{detail.username}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-base-content/60">{t('erp.auditDetail.time')}</label>
                  <p className="font-medium">{formatTimestamp(detail.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-base-content/60">{t('erp.auditDetail.ipAddress')}</label>
                  <p className="font-medium flex items-center gap-2">
                    {detail.ipAddress}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(detail.ipAddress, 'ip')}
                      className="sm:btn-xs min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0"
                      title={t('erp.auditDetail.copy')}
                    >
                      {copiedField === 'ip' ? (
                        <Check className="h-5 w-5 sm:h-3 sm:w-3 text-success" />
                      ) : (
                        <Copy className="h-5 w-5 sm:h-3 sm:w-3" />
                      )}
                    </Button>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-base-content/60">{t('erp.auditDetail.device')}</label>
                  <p className="font-medium">
                    {getDeviceEmoji(detail.deviceInfo.deviceType)} {detail.deviceInfo.deviceType}
                  </p>
                </div>
              </div>

              {/* Detailed field changes */}
              {detail.fieldChanges && detail.fieldChanges.length > 0 ? (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto border border-base-300 rounded-lg">
                    <table className="table w-full">
                      <thead className="bg-base-200">
                        <tr>
                          <th className="text-left">{t('erp.auditDetail.field')}</th>
                          <th className="text-left">{t('erp.auditDetail.oldValue')}</th>
                          <th className="text-center w-12">→</th>
                          <th className="text-left">{t('erp.auditDetail.newValue')}</th>
                          <th className="text-center w-32">{t('common.status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.fieldChanges.map((change, index) => (
                          <tr key={index} className="border-b border-base-300 last:border-0">
                            <td>
                              <div>
                                <p className="font-medium">{change.fieldLabel}</p>
                                <p className="text-xs text-base-content/50">{change.fieldName}</p>
                              </div>
                            </td>
                            <td
                              className={
                                change.changeType === 'REMOVED' ? 'line-through text-error' : ''
                              }
                            >
                              {change.isSensitive ? (
                                <span className="text-base-content/40">{t('erp.auditDetail.sensitiveMasked')}</span>
                              ) : (
                                <code className="bg-base-200 px-2 py-1 rounded text-xs">
                                  {change.oldValueFormatted || '-'}
                                </code>
                              )}
                            </td>
                            <td className="text-center text-base-content/40">→</td>
                            <td
                              className={
                                change.changeType === 'ADDED' ? 'font-medium text-success' : ''
                              }
                            >
                              {change.isSensitive ? (
                                <span className="text-base-content/40">{t('erp.auditDetail.sensitiveMasked')}</span>
                              ) : (
                                <code className="bg-base-200 px-2 py-1 rounded text-xs">
                                  {change.newValueFormatted || '-'}
                                </code>
                              )}
                            </td>
                            <td className="text-center">
                              <span className={`badge badge-sm ${getChangeTypeBadge(change.changeType)}`}>
                                {translateChangeType(change.changeType)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile vertical stack */}
                  <div className="md:hidden space-y-3">
                    {detail.fieldChanges.map((change, index) => (
                      <div key={index} className="border-l-4 border-base-300 pl-3 py-2 bg-base-100 rounded">
                        {/* Field label and badge */}
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium text-sm">{change.fieldLabel}</p>
                            <p className="text-xs text-base-content/50">{change.fieldName}</p>
                          </div>
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
                            <span className="text-base-content/60 text-xs">{t('erp.auditDetail.oldLabel')} </span>
                            {change.isSensitive ? (
                              <span className="text-base-content/40">{t('erp.auditDetail.sensitiveMasked')}</span>
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
                            <span className="text-base-content/60 text-xs">{t('erp.auditDetail.newLabel')} </span>
                            {change.isSensitive ? (
                              <span className="text-base-content/40">{t('erp.auditDetail.sensitiveMasked')}</span>
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
                </>
              ) : (
                <div className="text-center py-8 text-base-content/60">
                  {t('erp.auditDetail.noChanges')}
                </div>
              )}

              {/* Navigatsiya tugmalari */}
              {(detail.operatorLink || detail.entityLink) && (
                <div className="flex flex-wrap gap-2 pt-4">
                  {/* Operator (xodim) tugmasi */}
                  {detail.operatorLink && (
                    <a
                      href={detail.operatorLink}
                      className={buttonVariants({ variant: 'outline', className: 'w-full sm:w-auto min-h-[44px] sm:min-h-0 gap-2' })}
                      onClick={onClose}
                    >
                      <User className="h-5 w-5 sm:h-4 sm:w-4" />
                      {detail.username}
                    </a>
                  )}

                  {/* Obyekt tugmasi */}
                  {detail.entityLink && (
                    <a
                      href={detail.entityLink}
                      className={buttonVariants({ variant: 'primary', className: 'w-full sm:w-auto min-h-[44px] sm:min-h-0 gap-2' })}
                      onClick={onClose}
                    >
                      <ExternalLink className="h-5 w-5 sm:h-4 sm:w-4" />
                      {t('erp.auditDetail.entityPage', { entityType: detail.entityType })}
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* JSON Tab */}
          {activeTab === 'json' && (
            <div className="h-full">
              <JsonDiffViewer
                oldValue={detail.oldValue}
                newValue={detail.newValue}
                action={detail.action}
              />
            </div>
          )}

          {/* Meta Tab */}
          {activeTab === 'meta' && (
            <div className="space-y-4">
              {/* Device Info */}
              <div className="border border-base-300 rounded-lg p-3 sm:p-4 bg-base-100">
                <h3 className="font-medium mb-3 flex items-center gap-2 text-sm sm:text-base">
                  🖥️ {t('erp.auditDetail.deviceInfo')}
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <dt className="text-xs sm:text-sm text-base-content/60">{t('erp.auditDetail.deviceTypeLabel')}</dt>
                    <dd className="font-medium text-sm sm:text-base">{detail.deviceInfo.deviceType}</dd>
                  </div>
                  <div>
                    <dt className="text-xs sm:text-sm text-base-content/60">{t('erp.auditDetail.browser')}</dt>
                    <dd className="font-medium text-sm sm:text-base">
                      {detail.deviceInfo.browser}{' '}
                      {detail.deviceInfo.browserVersion && `${detail.deviceInfo.browserVersion}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs sm:text-sm text-base-content/60">{t('erp.auditDetail.os')}</dt>
                    <dd className="font-medium text-sm sm:text-base">
                      {detail.deviceInfo.os}{' '}
                      {detail.deviceInfo.osVersion && `${detail.deviceInfo.osVersion}`}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs sm:text-sm text-base-content/60 mb-1">User-Agent (Raw)</dt>
                    <dd className="font-mono text-xs bg-base-200 p-2 rounded break-all">
                      {detail.deviceInfo.userAgent}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(detail.deviceInfo.userAgent, 'useragent')}
                        className="sm:btn-xs ml-2 min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0"
                      >
                        {copiedField === 'useragent' ? (
                          <Check className="h-5 w-5 sm:h-3 sm:w-3 text-success" />
                        ) : (
                          <Copy className="h-5 w-5 sm:h-3 sm:w-3" />
                        )}
                      </Button>
                    </dd>
                  </div>
                </dl>
              </div>

              {/* General Info */}
              <div className="border border-base-300 rounded-lg p-3 sm:p-4 bg-base-100">
                <h3 className="font-medium mb-3 flex items-center gap-2 text-sm sm:text-base">
                  📋 {t('erp.auditDetail.generalInfo')}
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <dt className="text-xs sm:text-sm text-base-content/60">{t('erp.auditDetail.auditLogId')}</dt>
                    <dd className="font-medium text-sm sm:text-base">#{detail.id}</dd>
                  </div>
                  <div>
                    <dt className="text-xs sm:text-sm text-base-content/60">{t('erp.auditDetail.userId')}</dt>
                    <dd className="font-medium text-sm sm:text-base">#{detail.userId}</dd>
                  </div>
                  <div>
                    <dt className="text-xs sm:text-sm text-base-content/60">{t('erp.auditDetail.entityTypeLabel')}</dt>
                    <dd className="font-medium text-sm sm:text-base">{detail.entityType}</dd>
                  </div>
                  <div>
                    <dt className="text-xs sm:text-sm text-base-content/60">{t('erp.auditDetail.entityIdLabel')}</dt>
                    <dd className="font-medium text-sm sm:text-base">#{detail.entityId}</dd>
                  </div>
                  <div>
                    <dt className="text-xs sm:text-sm text-base-content/60">{t('erp.auditDetail.actionLabel')}</dt>
                    <dd>
                      <span className={`badge badge-sm ${getActionBadgeClass(detail.action)}`}>
                        {translateAction(detail.action)}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs sm:text-sm text-base-content/60">{t('erp.auditDetail.exactTime')}</dt>
                    <dd className="font-medium text-xs sm:text-sm">{formatFullTimestamp(detail.createdAt)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-t border-base-300 flex justify-end">
          <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto min-h-[44px]">
            {t('common.close')}
          </Button>
        </div>
      </div>
    </div>
  );
}

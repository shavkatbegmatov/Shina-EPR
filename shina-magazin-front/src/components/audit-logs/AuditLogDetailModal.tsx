import { useEffect, useState } from 'react';
import { X, Copy, ExternalLink, Loader2, Check } from 'lucide-react';
import { format } from 'date-fns';
import { uz } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { auditLogsApi } from '../../api/audit-logs.api';
import type { AuditLogDetailResponse } from '../../types';
import { JsonDiffViewer } from './JsonDiffViewer';

interface AuditLogDetailModalProps {
  logId: number;
  onClose: () => void;
}

type TabType = 'changes' | 'json' | 'meta';

export function AuditLogDetailModal({ logId, onClose }: AuditLogDetailModalProps) {
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
      toast.error('Batafsil ma\'lumotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
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
      toast.success('Nusxalandi');
    } catch (error) {
      toast.error('Nusxalashda xatolik');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-base-100 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-base-300 flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-bold">Audit Log Batafsil Ma'lumotlari</h2>
            <p className="text-sm text-base-content/60 mt-1">
              {detail.entityType} #{detail.entityId} -{' '}
              <span className={`badge badge-sm ${getActionBadgeClass(detail.action)}`}>
                {translateAction(detail.action)}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-sm btn-ghost btn-circle"
            aria-label="Yopish"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-base-300">
          <div className="flex gap-4 px-6">
            <button
              className={`py-3 px-4 border-b-2 transition font-medium text-sm ${
                activeTab === 'changes'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-base-content/60 hover:text-base-content'
              }`}
              onClick={() => setActiveTab('changes')}
            >
              O'zgarishlar
            </button>
            <button
              className={`py-3 px-4 border-b-2 transition font-medium text-sm ${
                activeTab === 'json'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-base-content/60 hover:text-base-content'
              }`}
              onClick={() => setActiveTab('json')}
            >
              JSON Ko'rinishi
            </button>
            <button
              className={`py-3 px-4 border-b-2 transition font-medium text-sm ${
                activeTab === 'meta'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-base-content/60 hover:text-base-content'
              }`}
              onClick={() => setActiveTab('meta')}
            >
              Texnik Ma'lumotlar
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Changes Tab */}
          {activeTab === 'changes' && (
            <div className="space-y-4">
              {/* Summary Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-base-200 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-base-content/60">Foydalanuvchi</label>
                  <p className="font-medium">{detail.username}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-base-content/60">Vaqt</label>
                  <p className="font-medium">{formatTimestamp(detail.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-base-content/60">IP Manzil</label>
                  <p className="font-medium flex items-center gap-2">
                    {detail.ipAddress}
                    <button
                      onClick={() => copyToClipboard(detail.ipAddress, 'ip')}
                      className="btn btn-ghost btn-xs btn-circle"
                      title="Nusxalash"
                    >
                      {copiedField === 'ip' ? (
                        <Check className="h-3 w-3 text-success" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-base-content/60">Qurilma</label>
                  <p className="font-medium">
                    {getDeviceEmoji(detail.deviceInfo.deviceType)} {detail.deviceInfo.deviceType}
                  </p>
                </div>
              </div>

              {/* Detailed field changes */}
              {detail.fieldChanges && detail.fieldChanges.length > 0 ? (
                <div className="overflow-x-auto border border-base-300 rounded-lg">
                  <table className="table w-full">
                    <thead className="bg-base-200">
                      <tr>
                        <th className="text-left">Maydon</th>
                        <th className="text-left">Eski qiymat</th>
                        <th className="text-center w-12">→</th>
                        <th className="text-left">Yangi qiymat</th>
                        <th className="text-center w-32">Holat</th>
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
                              <span className="text-base-content/40">****** (Maxfiy)</span>
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
                              <span className="text-base-content/40">****** (Maxfiy)</span>
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
              ) : (
                <div className="text-center py-8 text-base-content/60">
                  O'zgarishlar ma'lumoti mavjud emas
                </div>
              )}

              {detail.entityLink && (
                <div className="pt-4">
                  <a
                    href={detail.entityLink}
                    className="btn btn-primary btn-sm gap-2"
                    onClick={onClose}
                  >
                    <ExternalLink className="h-4 w-4" />
                    {detail.entityType} yozuviga o'tish
                  </a>
                </div>
              )}
            </div>
          )}

          {/* JSON Tab */}
          {activeTab === 'json' && (
            <div className="space-y-4">
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
              <div className="border border-base-300 rounded-lg p-4 bg-base-100">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  🖥️ Qurilma Ma'lumotlari
                </h3>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-base-content/60">Qurilma turi</dt>
                    <dd className="font-medium">{detail.deviceInfo.deviceType}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-base-content/60">Brauzer</dt>
                    <dd className="font-medium">
                      {detail.deviceInfo.browser}{' '}
                      {detail.deviceInfo.browserVersion && `${detail.deviceInfo.browserVersion}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-base-content/60">Operatsion tizim</dt>
                    <dd className="font-medium">
                      {detail.deviceInfo.os}{' '}
                      {detail.deviceInfo.osVersion && `${detail.deviceInfo.osVersion}`}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-sm text-base-content/60 mb-1">User-Agent (Raw)</dt>
                    <dd className="font-mono text-xs bg-base-200 p-2 rounded break-all">
                      {detail.deviceInfo.userAgent}
                      <button
                        onClick={() => copyToClipboard(detail.deviceInfo.userAgent, 'useragent')}
                        className="btn btn-ghost btn-xs ml-2"
                      >
                        {copiedField === 'useragent' ? (
                          <Check className="h-3 w-3 text-success" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </dd>
                  </div>
                </dl>
              </div>

              {/* General Info */}
              <div className="border border-base-300 rounded-lg p-4 bg-base-100">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  📋 Umumiy Ma'lumotlar
                </h3>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-base-content/60">Audit Log ID</dt>
                    <dd className="font-medium">#{detail.id}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-base-content/60">Foydalanuvchi ID</dt>
                    <dd className="font-medium">#{detail.userId}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-base-content/60">Obyekt turi</dt>
                    <dd className="font-medium">{detail.entityType}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-base-content/60">Obyekt ID</dt>
                    <dd className="font-medium">#{detail.entityId}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-base-content/60">Amal</dt>
                    <dd>
                      <span className={`badge ${getActionBadgeClass(detail.action)}`}>
                        {translateAction(detail.action)}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-base-content/60">Vaqt (aniq)</dt>
                    <dd className="font-medium text-sm">{formatFullTimestamp(detail.createdAt)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-base-300 flex justify-end">
          <button onClick={onClose} className="btn btn-ghost">
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
}

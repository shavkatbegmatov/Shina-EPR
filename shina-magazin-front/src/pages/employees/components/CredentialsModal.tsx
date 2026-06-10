import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Copy, AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/ui';
import type { CredentialsInfo } from '../../../types';

interface CredentialsModalProps {
  credentials: CredentialsInfo;
  employeeName: string;
  onClose: () => void;
}

export function CredentialsModal({ credentials, employeeName, onClose }: CredentialsModalProps) {
  const { t } = useTranslation();
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null);

  const copyToClipboard = async (text: string, field: 'username' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success(t("erp.credentialsModal.copied"));
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error(t("erp.credentialsModal.copyError"));
    }
  };

  const copyAll = async () => {
    const text = `Username: ${credentials.username}\nParol: ${credentials.temporaryPassword}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("erp.credentialsModal.allCopied"));
    } catch {
      toast.error(t("erp.credentialsModal.copyError"));
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-success/15 text-success">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">{t("erp.credentialsModal.accountCreated")}</h3>
              <p className="text-sm text-base-content/60">{employeeName}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="btn-circle" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Credentials */}
        <div className="space-y-3">
          {/* Username */}
          <div className="surface-soft rounded-lg p-4">
            <label className="text-xs text-base-content/60 uppercase tracking-wider">
              {t("erp.credentialsModal.username")}
            </label>
            <div className="flex items-center justify-between mt-1">
              <code className="text-lg font-mono font-semibold">{credentials.username}</code>
              <Button
                variant="ghost"
                size="sm"
                className={copiedField === 'username' ? 'text-success' : ''}
                onClick={() => copyToClipboard(credentials.username, 'username')}
              >
                {copiedField === 'username' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Password */}
          <div className="surface-soft rounded-lg p-4">
            <label className="text-xs text-base-content/60 uppercase tracking-wider">
              {t("erp.credentialsModal.temporaryPassword")}
            </label>
            <div className="flex items-center justify-between mt-1">
              <code className="text-lg font-mono font-semibold text-primary">
                {credentials.temporaryPassword}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className={copiedField === 'password' ? 'text-success' : ''}
                onClick={() => copyToClipboard(credentials.temporaryPassword, 'password')}
              >
                {copiedField === 'password' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="alert alert-warning mt-4">
          <AlertTriangle className="h-5 w-5" />
          <div>
            <p className="font-medium">{t("erp.credentialsModal.warningTitle")}</p>
            <p className="text-sm">
              {t("erp.credentialsModal.warningText")}
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 text-sm text-base-content/70">
          <p className="font-medium mb-2">{t("erp.credentialsModal.instructionsTitle")}</p>
          <ol className="list-decimal list-inside space-y-1 text-base-content/60">
            <li>{t("erp.credentialsModal.instruction1")}</li>
            <li>{t("erp.credentialsModal.instruction2")}</li>
            <li>{t("erp.credentialsModal.instruction3")}</li>
          </ol>
        </div>

        {/* Actions */}
        <div className="modal-action">
          <Button variant="ghost" onClick={copyAll}>
            <Copy className="h-4 w-4" />
            {t("erp.credentialsModal.copyAll")}
          </Button>
          <Button variant="primary" onClick={onClose}>
            {t("erp.credentialsModal.understood")}
          </Button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}

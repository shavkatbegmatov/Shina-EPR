import { useState } from 'react';
import { CheckCircle, Copy, AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import type { CredentialsInfo } from '../../../types';

interface CredentialsModalProps {
  credentials: CredentialsInfo;
  employeeName: string;
  onClose: () => void;
}

export function CredentialsModal({ credentials, employeeName, onClose }: CredentialsModalProps) {
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null);

  const copyToClipboard = async (text: string, field: 'username' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success("Nusxa olindi!");
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Nusxa olishda xatolik");
    }
  };

  const copyAll = async () => {
    const text = `Username: ${credentials.username}\nParol: ${credentials.temporaryPassword}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Barcha ma'lumotlar nusxa olindi!");
    } catch {
      toast.error("Nusxa olishda xatolik");
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
              <h3 className="text-lg font-bold">Hisob yaratildi!</h3>
              <p className="text-sm text-base-content/60">{employeeName}</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm btn-circle" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Credentials */}
        <div className="space-y-3">
          {/* Username */}
          <div className="surface-soft rounded-lg p-4">
            <label className="text-xs text-base-content/60 uppercase tracking-wider">
              Foydalanuvchi nomi
            </label>
            <div className="flex items-center justify-between mt-1">
              <code className="text-lg font-mono font-semibold">{credentials.username}</code>
              <button
                className={`btn btn-ghost btn-sm ${copiedField === 'username' ? 'text-success' : ''}`}
                onClick={() => copyToClipboard(credentials.username, 'username')}
              >
                {copiedField === 'username' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Password */}
          <div className="surface-soft rounded-lg p-4">
            <label className="text-xs text-base-content/60 uppercase tracking-wider">
              Vaqtinchalik parol
            </label>
            <div className="flex items-center justify-between mt-1">
              <code className="text-lg font-mono font-semibold text-primary">
                {credentials.temporaryPassword}
              </code>
              <button
                className={`btn btn-ghost btn-sm ${copiedField === 'password' ? 'text-success' : ''}`}
                onClick={() => copyToClipboard(credentials.temporaryPassword, 'password')}
              >
                {copiedField === 'password' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="alert alert-warning mt-4">
          <AlertTriangle className="h-5 w-5" />
          <div>
            <p className="font-medium">Diqqat!</p>
            <p className="text-sm">
              Bu ma'lumotlar faqat bir marta ko'rsatiladi. Xodimga yetkazing va
              birinchi kirishda parolni o'zgartirishini ayting.
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 text-sm text-base-content/70">
          <p className="font-medium mb-2">Xodimga aytish kerak:</p>
          <ol className="list-decimal list-inside space-y-1 text-base-content/60">
            <li>Tizimga kirish uchun username va parolni kiriting</li>
            <li>Birinchi kirishda yangi parol o'rnatiladi</li>
            <li>Yangi parol kamida 6 belgidan iborat bo'lishi kerak</li>
          </ol>
        </div>

        {/* Actions */}
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={copyAll}>
            <Copy className="h-4 w-4" />
            Hammasini nusxalash
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            Tushunarli
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}

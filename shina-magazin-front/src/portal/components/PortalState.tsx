import { useTranslation } from 'react-i18next';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/ui';

/** Sahifa yuklanmoqda — markazdagi spinner. */
export function PortalLoading() {
  return (
    <div className="flex items-center justify-center h-64" role="status" aria-live="polite">
      <span className="loading loading-spinner loading-lg text-primary"></span>
    </div>
  );
}

interface PortalErrorProps {
  message: string;
  onRetry?: () => void;
}

/**
 * Yuklash xatosi — xabar va "Qayta urinish".
 *
 * Ilgari kabinet sahifalarida xato faqat console'ga yozilardi va foydalanuvchi
 * doimiy bo'sh ro'yxat ko'rardi ("xaridlaringiz yo'q" bilan farqlab bo'lmasdi).
 */
export function PortalError({ message, onRetry }: PortalErrorProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center" role="alert">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-error/10 text-error">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div>
        <p className="font-semibold">{t('common.loadFailed')}</p>
        <p className="mt-1 text-sm text-base-content/60">{message}</p>
      </div>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}

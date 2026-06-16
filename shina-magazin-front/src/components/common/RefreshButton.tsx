import { RefreshCw, Check } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui';

interface RefreshButtonProps {
  onClick: () => void;
  loading: boolean;
  success: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Standardized refresh button with success feedback
 *
 * Features:
 * - Shows spinning icon during loading
 * - Changes to success state (green with checkmark) after refresh
 * - Updates text to show loading status
 * - Disabled during loading or when explicitly disabled
 *
 * @example
 * <RefreshButton
 *   onClick={() => loadData(true)}
 *   loading={refreshing}
 *   success={refreshSuccess}
 *   disabled={initialLoading}
 * />
 */
export function RefreshButton({
  onClick,
  loading,
  success,
  disabled = false,
  className,
}: RefreshButtonProps) {
  const { t } = useTranslation();
  return (
    <Button
      size="sm"
      variant={success ? 'success' : 'ghost'}
      className={clsx('gap-2 transition-all', className)}
      onClick={onClick}
      disabled={disabled || loading}
      title={success ? t('erp.ui.refreshed') : t('common.refresh')}
    >
      {success ? (
        <>
          <Check className="h-4 w-4" />
          {t('erp.ui.refreshed')}
        </>
      ) : (
        <>
          <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
          {loading ? t('erp.ui.refreshing') : t('common.refresh')}
        </>
      )}
    </Button>
  );
}

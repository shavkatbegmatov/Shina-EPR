import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldX, Home, ArrowLeft } from 'lucide-react';
import { Button, buttonVariants } from '@/ui';

interface AccessDeniedProps {
  /**
   * Custom title for the access denied page
   */
  title?: string;

  /**
   * Custom message explaining why access is denied
   */
  message?: string;

  /**
   * The permission code that was required
   */
  requiredPermission?: string;

  /**
   * Show back button instead of home button
   */
  showBackButton?: boolean;
}

/**
 * AccessDenied component displays when user lacks permission to access a page.
 *
 * @example
 * <AccessDenied />
 *
 * @example
 * <AccessDenied
 *   title="Ombor sahifasi"
 *   message="Ombor bo'limiga kirish uchun WAREHOUSE_VIEW huquqi kerak"
 *   requiredPermission="WAREHOUSE_VIEW"
 * />
 */
export function AccessDenied({
  title,
  message,
  requiredPermission,
  showBackButton = false,
}: AccessDeniedProps) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t("erp.accessDenied.title");
  const resolvedMessage = message ?? t("erp.accessDenied.message");
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-error/20 blur-2xl rounded-full" />
            <div className="relative p-6 bg-error/10 rounded-full">
              <ShieldX className="h-16 w-16 text-error" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold mt-8 text-base-content">
          {resolvedTitle}
        </h1>

        {/* Message */}
        <p className="text-base-content/60 mt-3 leading-relaxed">
          {resolvedMessage}
        </p>

        {/* Required Permission Badge */}
        {requiredPermission && (
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-base-200 rounded-lg">
            <span className="text-sm text-base-content/50">{t("erp.accessDenied.requiredPermissionLabel")}</span>
            <code className="text-sm font-mono text-error font-medium">
              {requiredPermission}
            </code>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          {showBackButton ? (
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("common.back")}
            </Button>
          ) : null}
          <Link to="/" className={buttonVariants({ variant: "primary", className: "gap-2" })}>
            <Home className="h-4 w-4" />
            {t("erp.accessDenied.goHome")}
          </Link>
        </div>

        {/* Help text */}
        <p className="mt-8 text-xs text-base-content/40">
          {t("erp.accessDenied.helpText")}
        </p>
      </div>
    </div>
  );
}

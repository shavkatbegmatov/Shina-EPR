import type { ReactNode } from 'react';
import { useAuthStore } from '../../store/authStore';
import { AccessDenied } from './AccessDenied';

interface ProtectedRouteProps {
  /**
   * Single permission or array of permissions required to access this route
   */
  permission?: string | string[];

  /**
   * If true, user must have ALL permissions. If false, any permission is sufficient.
   * Default: false
   */
  requireAll?: boolean;

  /**
   * Content to render when user has permission
   */
  children: ReactNode;

  /**
   * Custom title for access denied page
   */
  deniedTitle?: string;

  /**
   * Custom message for access denied page
   */
  deniedMessage?: string;
}

/**
 * ProtectedRoute component for route-level permission checking.
 * Use this to wrap page components in the router configuration.
 *
 * @example
 * // Single permission
 * <ProtectedRoute permission="WAREHOUSE_VIEW">
 *   <WarehousePage />
 * </ProtectedRoute>
 *
 * @example
 * // Multiple permissions (any)
 * <ProtectedRoute permission={["REPORTS_VIEW_SALES", "REPORTS_VIEW_WAREHOUSE"]}>
 *   <ReportsPage />
 * </ProtectedRoute>
 *
 * @example
 * // Multiple permissions (all required)
 * <ProtectedRoute permission={["SALES_VIEW", "SALES_CREATE"]} requireAll>
 *   <POSPage />
 * </ProtectedRoute>
 *
 * @example
 * // No permission required (profile page)
 * <ProtectedRoute>
 *   <ProfilePage />
 * </ProtectedRoute>
 */
export function ProtectedRoute({
  permission,
  requireAll = false,
  children,
  deniedTitle,
  deniedMessage,
}: ProtectedRouteProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuthStore();

  // If no permission specified, allow access (e.g., profile page)
  if (!permission) {
    return <>{children}</>;
  }

  const permissions = Array.isArray(permission) ? permission : [permission];

  let hasAccess: boolean;

  if (permissions.length === 1) {
    hasAccess = hasPermission(permissions[0]);
  } else if (requireAll) {
    hasAccess = hasAllPermissions(...permissions);
  } else {
    hasAccess = hasAnyPermission(...permissions);
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        title={deniedTitle}
        message={deniedMessage}
        requiredPermission={permissions.join(', ')}
        showBackButton
      />
    );
  }

  return <>{children}</>;
}

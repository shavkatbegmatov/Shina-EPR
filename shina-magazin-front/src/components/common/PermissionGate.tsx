import type { ReactNode } from 'react';
import { useAuthStore } from '../../store/authStore';

interface PermissionGateProps {
  /**
   * Single permission or array of permissions to check
   */
  permission: string | string[];

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
   * Optional fallback content when user doesn't have permission
   */
  fallback?: ReactNode;
}

/**
 * Component for conditional rendering based on user permissions
 *
 * @example
 * // Single permission
 * <PermissionGate permission="PRODUCTS_DELETE">
 *   <DeleteButton />
 * </PermissionGate>
 *
 * @example
 * // Any of permissions
 * <PermissionGate permission={["PRODUCTS_UPDATE", "PRODUCTS_DELETE"]}>
 *   <EditButton />
 * </PermissionGate>
 *
 * @example
 * // All permissions required
 * <PermissionGate permission={["PRODUCTS_UPDATE", "PRODUCTS_DELETE"]} requireAll>
 *   <AdvancedEditButton />
 * </PermissionGate>
 *
 * @example
 * // With fallback
 * <PermissionGate permission="REPORTS_EXPORT" fallback={<p>Eksport qilish huquqi yo'q</p>}>
 *   <ExportButton />
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  requireAll = false,
  children,
  fallback = null,
}: PermissionGateProps) {
  // Subscribe to permissions state to trigger re-render when permissions change
  const userPermissions = useAuthStore((state) => state.permissions);

  const permissions = Array.isArray(permission) ? permission : [permission];

  let hasAccess: boolean;

  if (permissions.length === 1) {
    hasAccess = userPermissions.has(permissions[0]);
    console.log(`[PermissionGate] Checking ${permissions[0]}: ${hasAccess} (total permissions: ${userPermissions.size})`);
  } else if (requireAll) {
    hasAccess = permissions.every(p => userPermissions.has(p));
  } else {
    hasAccess = permissions.some(p => userPermissions.has(p));
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

interface RoleGateProps {
  /**
   * Single role or array of roles to check
   */
  role: string | string[];

  /**
   * If true, user must have ALL roles. If false, any role is sufficient.
   * Default: false
   */
  requireAll?: boolean;

  /**
   * Content to render when user has role
   */
  children: ReactNode;

  /**
   * Optional fallback content when user doesn't have role
   */
  fallback?: ReactNode;
}

/**
 * Component for conditional rendering based on user roles
 *
 * @example
 * <RoleGate role="ADMIN">
 *   <AdminPanel />
 * </RoleGate>
 */
export function RoleGate({
  role,
  requireAll = false,
  children,
  fallback = null,
}: RoleGateProps) {
  const { hasRole, roles } = useAuthStore();

  const requiredRoles = Array.isArray(role) ? role : [role];

  let hasAccess: boolean;

  if (requiredRoles.length === 1) {
    hasAccess = hasRole(requiredRoles[0]);
  } else if (requireAll) {
    hasAccess = requiredRoles.every(r => roles.has(r));
  } else {
    hasAccess = requiredRoles.some(r => roles.has(r));
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

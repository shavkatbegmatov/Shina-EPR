import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  permissions: Set<string>;
  roles: Set<string>;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string, permissions?: string[], roles?: string[]) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (...permissions: string[]) => boolean;
  hasAllPermissions: (...permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      permissions: new Set<string>(),
      roles: new Set<string>(),
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken, permissions = [], roles = []) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);

        const newPermissionsSet = new Set(permissions);
        const newRolesSet = new Set(roles);

        set({
          user,
          accessToken,
          refreshToken,
          permissions: newPermissionsSet,
          roles: newRolesSet,
          isAuthenticated: true,
        });
      },

      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          permissions: new Set<string>(),
          roles: new Set<string>(),
          isAuthenticated: false,
        });
      },

      hasPermission: (permission: string) => {
        return get().permissions.has(permission);
      },

      hasAnyPermission: (...permissions: string[]) => {
        const userPermissions = get().permissions;
        return permissions.some(p => userPermissions.has(p));
      },

      hasAllPermissions: (...permissions: string[]) => {
        const userPermissions = get().permissions;
        return permissions.every(p => userPermissions.has(p));
      },

      hasRole: (role: string) => {
        return get().roles.has(role);
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        permissions: Array.from(state.permissions),
        roles: Array.from(state.roles),
      }),
      // Deserialize permissions and roles from array back to Set
      onRehydrateStorage: () => (state) => {
        if (state) {
          // permissions comes as array from storage, convert to Set
          if (Array.isArray(state.permissions)) {
            state.permissions = new Set(state.permissions as unknown as string[]);
          }
          // roles comes as array from storage, convert to Set
          if (Array.isArray(state.roles)) {
            state.roles = new Set(state.roles as unknown as string[]);
          }
        }
      },
    }
  )
);

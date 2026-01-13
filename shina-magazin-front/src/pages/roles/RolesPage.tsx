import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Search,
  Users,
  Key,
  Lock,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { rolesApi, permissionsApi } from '../../api/roles.api';
import { ModalPortal } from '../../components/common/Modal';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import type { Role, RoleRequest } from '../../types';

export function RolesPage() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<RoleRequest>({
    name: '',
    code: '',
    description: '',
    permissions: [],
  });
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();

  // Fetch roles
  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles', search],
    queryFn: () => rolesApi.search({ search, size: 100 }),
  });

  // Fetch all permissions grouped by module
  const { data: permissionsGrouped } = useQuery({
    queryKey: ['permissions-grouped'],
    queryFn: () => permissionsApi.getAllGrouped(),
  });

  // Create role mutation
  const createMutation = useMutation({
    mutationFn: rolesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Rol yaratildi');
      closeModal();
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Xato yuz berdi');
    },
  });

  // Update role mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: RoleRequest }) =>
      rolesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Rol yangilandi');
      closeModal();
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Xato yuz berdi');
    },
  });

  // Delete role mutation
  const deleteMutation = useMutation({
    mutationFn: rolesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success("Rol o'chirildi");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Xato yuz berdi');
    },
  });

  const openModal = (role?: Role) => {
    if (role) {
      setSelectedRole(role);
      setFormData({
        name: role.name,
        code: role.code,
        description: role.description || '',
        permissions: role.permissions ? Array.from(role.permissions) : [],
      });
      setSelectedPermissions(new Set(role.permissions || []));
    } else {
      setSelectedRole(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        permissions: [],
      });
      setSelectedPermissions(new Set());
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRole(null);
    setFormData({ name: '', code: '', description: '', permissions: [] });
    setSelectedPermissions(new Set());
  };

  const handleSubmit = () => {
    const data: RoleRequest = {
      ...formData,
      permissions: Array.from(selectedPermissions),
    };

    if (selectedRole) {
      updateMutation.mutate({ id: selectedRole.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (role: Role) => {
    if (role.isSystem) {
      toast.error("Tizim rollarini o'chirish mumkin emas");
      return;
    }
    if (confirm(`"${role.name}" rolini o'chirishni tasdiqlaysizmi?`)) {
      deleteMutation.mutate(role.id);
    }
  };

  const togglePermission = (code: string) => {
    const newSet = new Set(selectedPermissions);
    if (newSet.has(code)) {
      newSet.delete(code);
    } else {
      newSet.add(code);
    }
    setSelectedPermissions(newSet);
  };

  const toggleModule = (module: string) => {
    const modulePermissions = permissionsGrouped?.[module] || [];
    const allSelected = modulePermissions.every(p => selectedPermissions.has(p.code));
    const newSet = new Set(selectedPermissions);

    if (allSelected) {
      modulePermissions.forEach(p => newSet.delete(p.code));
    } else {
      modulePermissions.forEach(p => newSet.add(p.code));
    }
    setSelectedPermissions(newSet);
  };

  const isModuleSelected = (module: string) => {
    const modulePermissions = permissionsGrouped?.[module] || [];
    return modulePermissions.length > 0 && modulePermissions.every(p => selectedPermissions.has(p.code));
  };

  const isModulePartiallySelected = (module: string) => {
    const modulePermissions = permissionsGrouped?.[module] || [];
    const selectedCount = modulePermissions.filter(p => selectedPermissions.has(p.code)).length;
    return selectedCount > 0 && selectedCount < modulePermissions.length;
  };

  const selectAllPermissions = () => {
    if (!permissionsGrouped) return;
    const allCodes = Object.values(permissionsGrouped).flat().map(p => p.code);
    setSelectedPermissions(new Set(allCodes));
  };

  const clearAllPermissions = () => {
    setSelectedPermissions(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rollar boshqaruvi</h1>
          <p className="text-sm text-base-content/60">
            Foydalanuvchi rollari va huquqlarini boshqarish
          </p>
        </div>
        <PermissionGate permission={PermissionCode.ROLES_CREATE}>
          <button className="btn btn-primary" onClick={() => openModal()}>
            <Plus className="h-5 w-5" />
            Yangi rol
          </button>
        </PermissionGate>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-base-content/40" />
        <input
          type="text"
          placeholder="Rol nomi yoki kodi..."
          className="input input-bordered w-full pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Roles Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles?.content?.map((role) => (
            <div
              key={role.id}
              className="card bg-base-100 border border-base-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="card-body p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`grid h-10 w-10 place-items-center rounded-lg ${
                      role.isSystem ? 'bg-primary/15 text-primary' : 'bg-secondary/15 text-secondary'
                    }`}>
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{role.name}</h3>
                      <p className="text-xs text-base-content/50">{role.code}</p>
                    </div>
                  </div>
                  {role.isSystem && (
                    <span className="badge badge-primary badge-sm">Tizim</span>
                  )}
                </div>

                {role.description && (
                  <p className="mt-2 text-sm text-base-content/60 line-clamp-2">
                    {role.description}
                  </p>
                )}

                <div className="mt-3 flex gap-4 text-sm text-base-content/60">
                  <div className="flex items-center gap-1">
                    <Key className="h-4 w-4" />
                    <span>{role.permissionCount || 0} huquq</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{role.userCount || 0} foydalanuvchi</span>
                  </div>
                </div>

                <div className="card-actions mt-3 justify-end">
                  <PermissionGate permission={PermissionCode.ROLES_UPDATE}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => openModal(role)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </PermissionGate>
                  <PermissionGate permission={PermissionCode.ROLES_DELETE}>
                    <button
                      className="btn btn-ghost btn-sm text-error"
                      onClick={() => handleDelete(role)}
                      disabled={role.isSystem || deleteMutation.isPending}
                    >
                      {role.isSystem ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </PermissionGate>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <ModalPortal isOpen={showModal} onClose={closeModal}>
        <div className="w-full max-w-4xl bg-base-100 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">
                  {selectedRole ? 'Rolni tahrirlash' : 'Yangi rol yaratish'}
                </h3>
                <p className="text-sm text-base-content/60">
                  {selectedRole ? "Rol ma'lumotlari va huquqlarini o'zgartirish" : "Yangi rol va huquqlarni belgilash"}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={closeModal}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {/* System role warning */}
              {selectedRole?.isSystem && (
                <div className="alert alert-warning">
                  <Lock className="h-4 w-4" />
                  <span>Bu tizim roli. Faqat huquqlarni o'zgartirish mumkin.</span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="form-control">
                  <span className="label-text">Rol nomi *</span>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Masalan: Katta sotuvchi"
                    disabled={selectedRole?.isSystem}
                  />
                </label>
                <label className="form-control">
                  <span className="label-text">Rol kodi *</span>
                  <input
                    type="text"
                    className="input input-bordered uppercase"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                    placeholder="Masalan: SENIOR_SELLER"
                    disabled={!!selectedRole}
                  />
                </label>
              </div>

              <label className="form-control">
                <span className="label-text">Tavsif</span>
                <textarea
                  className="textarea textarea-bordered"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Rol haqida qisqacha ma'lumot..."
                  disabled={selectedRole?.isSystem}
                />
              </label>

              {/* Permissions section */}
              <div className="divider">Huquqlar</div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-base-content/60">
                  {selectedPermissions.size} ta huquq tanlangan
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={selectAllPermissions}
                  >
                    Hammasini tanlash
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={clearAllPermissions}
                  >
                    Tozalash
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto rounded-lg border border-base-200 p-2">
                {permissionsGrouped && Object.entries(permissionsGrouped).map(([module, permissions]) => (
                  <div key={module} className="mb-3 last:mb-0">
                    <label className="flex items-center gap-2 p-2 rounded-lg bg-base-200/50 cursor-pointer hover:bg-base-200">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm checkbox-primary"
                        checked={isModuleSelected(module)}
                        ref={(el) => {
                          if (el) el.indeterminate = isModulePartiallySelected(module);
                        }}
                        onChange={() => toggleModule(module)}
                      />
                      <span className="font-medium text-sm">{module}</span>
                      <span className="text-xs text-base-content/50">
                        ({permissions.length})
                      </span>
                    </label>
                    <div className="mt-1 ml-6 grid grid-cols-2 sm:grid-cols-3 gap-1">
                      {permissions.map((permission) => (
                        <label
                          key={permission.code}
                          className="flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-base-200/50"
                        >
                          <input
                            type="checkbox"
                            className="checkbox checkbox-xs"
                            checked={selectedPermissions.has(permission.code)}
                            onChange={() => togglePermission(permission.code)}
                          />
                          <span className="text-xs">{permission.action}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={closeModal}>
                Bekor qilish
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={
                  !formData.name ||
                  !formData.code ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <span className="loading loading-spinner loading-sm" />
                )}
                {selectedRole ? 'Saqlash' : 'Yaratish'}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}

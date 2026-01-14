import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  UserCog,
  Phone,
  Mail,
  X,
  Briefcase,
  Users,
  Calendar,
  Shield,
  UserCheck,
  UserX,
  UserPlus,
  Clock,
  CreditCard,
  AlertCircle,
  Edit3,
  Check,
  Key,
  Link2,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { employeesApi } from '../../api/employees.api';
import { rolesApi } from '../../api/roles.api';
import { formatCurrency, formatDate, EMPLOYEE_STATUSES, ROLES, getTashkentToday } from '../../config/constants';
import { DataTable, Column } from '../../components/ui/DataTable';
import { ModalPortal } from '../../components/common/Modal';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { Select } from '../../components/ui/Select';
import { SearchInput } from '../../components/ui/SearchInput';
import { CredentialsModal } from './components/CredentialsModal';
import { useHighlight } from '../../hooks/useHighlight';
import type { CredentialsInfo, Employee, EmployeeRequest, EmployeeStatus, Role, User } from '../../types';

const emptyFormData: EmployeeRequest = {
  fullName: '',
  phone: '',
  email: '',
  position: '',
  department: '',
  salary: undefined,
  hireDate: getTashkentToday(),
  status: 'ACTIVE',
  birthDate: '',
  passportNumber: '',
  address: '',
  bankAccountNumber: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  userId: undefined,
  createUserAccount: false,
  roleCode: '',
};

type ModalTab = 'basic' | 'extended';

// Validate phone number: +998 followed by exactly 9 digits
const isValidPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 12 && cleaned.startsWith('998');
};

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeRequest>(emptyFormData);
  const [saving, setSaving] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab>('basic');

  // Stats
  const [activeCount, setActiveCount] = useState(0);
  const [onLeaveCount, setOnLeaveCount] = useState(0);

  // Available users for linking
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  // Available roles for new user account
  const [roles, setRoles] = useState<Role[]>([]);

  // Credentials modal for newly created user
  const [newCredentials, setNewCredentials] = useState<CredentialsInfo | null>(null);
  const [credentialsEmployeeName, setCredentialsEmployeeName] = useState('');

  // Role change state
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [selectedNewRoleCode, setSelectedNewRoleCode] = useState<string>('');
  const [changingRole, setChangingRole] = useState(false);

  // Access type: 'none' | 'create' | 'link'
  const [accessType, setAccessType] = useState<'none' | 'create' | 'link'>('none');

  const { highlightId, clearHighlight } = useHighlight();
  const hasSearch = useMemo(() => search.trim().length > 0, [search]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  const handleOpenEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      fullName: employee.fullName,
      phone: employee.phone,
      email: employee.email || '',
      position: employee.position,
      department: employee.department || '',
      salary: employee.salary,
      hireDate: employee.hireDate,
      status: employee.status,
      birthDate: employee.birthDate || '',
      passportNumber: employee.passportNumber || '',
      address: employee.address || '',
      bankAccountNumber: employee.bankAccountNumber || '',
      emergencyContactName: employee.emergencyContactName || '',
      emergencyContactPhone: employee.emergencyContactPhone || '',
      userId: employee.userId,
    });
    setModalTab('basic');
    loadRoles(); // Load roles for role display and editing
    setShowModal(true);
  };

  // Table columns
  const columns: Column<Employee>[] = useMemo(() => [
    {
      key: 'fullName',
      header: 'Xodim',
      render: (employee) => (
        <div className="flex items-center gap-3">
          <div className="avatar placeholder">
            <div className="w-10 rounded-full bg-primary/15 text-primary">
              <span>{employee.fullName.charAt(0).toUpperCase()}</span>
            </div>
          </div>
          <div>
            <div className="font-medium">{employee.fullName}</div>
            <div className="text-sm text-base-content/70">{employee.position}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Aloqa',
      render: (employee) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-base-content/50" />
            <span className="text-sm">{employee.phone}</span>
          </div>
          {employee.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-base-content/50" />
              <span className="text-sm text-base-content/70">{employee.email}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'department',
      header: "Bo'lim",
      render: (employee) => (
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-base-content/50" />
          <span>{employee.department || '—'}</span>
        </div>
      ),
    },
    {
      key: 'hireDate',
      header: 'Ishga qabul',
      render: (employee) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-base-content/50" />
          <span>{formatDate(employee.hireDate)}</span>
        </div>
      ),
    },
    {
      key: 'salary',
      header: 'Maosh',
      getValue: (employee) => employee.salary || 0,
      render: (employee) => (
        <span className="font-medium">
          {employee.salary ? formatCurrency(employee.salary) : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (employee) => (
        <span className={clsx('badge badge-sm', EMPLOYEE_STATUSES[employee.status]?.color)}>
          {EMPLOYEE_STATUSES[employee.status]?.label}
        </span>
      ),
    },
    {
      key: 'userAccount',
      header: 'Tizim',
      render: (employee) => (
        employee.hasUserAccount ? (
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-success" />
            <span className="text-sm text-success">{employee.username}</span>
          </div>
        ) : (
          <span className="text-sm text-base-content/50">—</span>
        )
      ),
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      render: (employee) => (
        <button
          className="btn btn-ghost btn-sm"
          onClick={(e) => { e.stopPropagation(); handleOpenEditModal(employee); }}
        >
          Tahrirlash
        </button>
      ),
    },
  ], []);

  const loadEmployees = useCallback(async (isInitial = false) => {
    if (!isInitial) {
      setRefreshing(true);
    }
    try {
      const data = await employeesApi.getAll({
        page,
        size: pageSize,
        search: search || undefined,
      });
      setEmployees(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [page, pageSize, search]);

  const loadStats = useCallback(async () => {
    try {
      const [active, onLeave] = await Promise.all([
        employeesApi.getByStatus('ACTIVE'),
        employeesApi.getByStatus('ON_LEAVE'),
      ]);
      setActiveCount(active.length);
      setOnLeaveCount(onLeave.length);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  const loadAvailableUsers = useCallback(async () => {
    try {
      const users = await employeesApi.getAvailableUsers();
      setAvailableUsers(users);
    } catch (error) {
      console.error('Failed to load available users:', error);
    }
  }, []);

  const loadRoles = useCallback(async () => {
    try {
      const data = await rolesApi.getAll();
      // Filter only active roles
      setRoles(data.filter(role => role.isActive));
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadEmployees(true);
    loadStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when filters change
  useEffect(() => {
    loadEmployees();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search]);

  const handleOpenNewModal = () => {
    setEditingEmployee(null);
    setFormData(emptyFormData);
    setModalTab('basic');
    setAccessType('none');
    loadAvailableUsers();
    loadRoles();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEmployee(null);
    setFormData(emptyFormData);
    setModalTab('basic');
    setAccessType('none');
    setIsEditingRole(false);
    setSelectedNewRoleCode('');
  };

  const handleFormChange = (field: keyof EmployeeRequest, value: string | number | boolean | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveEmployee = async () => {
    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.position.trim()) return;
    setSaving(true);
    try {
      const dataToSend = {
        ...formData,
        birthDate: formData.birthDate || undefined,
        passportNumber: formData.passportNumber || undefined,
        address: formData.address || undefined,
        bankAccountNumber: formData.bankAccountNumber || undefined,
        emergencyContactName: formData.emergencyContactName || undefined,
        emergencyContactPhone: formData.emergencyContactPhone || undefined,
        userId: formData.createUserAccount ? undefined : (formData.userId || undefined),
        createUserAccount: formData.createUserAccount || undefined,
        roleCode: formData.createUserAccount ? formData.roleCode : undefined,
      };

      let result;
      if (editingEmployee) {
        result = await employeesApi.update(editingEmployee.id, dataToSend);
        toast.success('Xodim muvaffaqiyatli yangilandi');
      } else {
        result = await employeesApi.create(dataToSend);
        toast.success('Yangi xodim muvaffaqiyatli qo\'shildi');
      }

      // Check if credentials were returned (new user created)
      if (result.newCredentials) {
        setCredentialsEmployeeName(result.fullName);
        setNewCredentials(result.newCredentials);
      }

      handleCloseModal();
      loadEmployees();
      loadStats();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; data?: Record<string, string> } } };

      // Check if it's a validation error with field-specific messages
      if (err.response?.data?.data && typeof err.response.data.data === 'object') {
        const validationErrors = err.response.data.data;
        const errorMessages = Object.values(validationErrors).join('\n');
        toast.error(errorMessages || 'Validatsiya xatosi', { duration: 5000 });
      } else {
        toast.error(err.response?.data?.message || 'Xodimni saqlashda xatolik yuz berdi');
      }
      console.error('Failed to save employee:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!editingEmployee) return;
    if (!window.confirm(`"${editingEmployee.fullName}" xodimini o'chirmoqchimisiz?`)) return;

    setSaving(true);
    try {
      await employeesApi.delete(editingEmployee.id);
      toast.success('Xodim muvaffaqiyatli o\'chirildi');
      handleCloseModal();
      loadEmployees();
      loadStats();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Xodimni o\'chirishda xatolik yuz berdi');
      console.error('Failed to delete employee:', error);
    } finally {
      setSaving(false);
    }
  };

  // Handle role change for existing user - uses dedicated employee role endpoint
  const handleChangeRole = async () => {
    if (!editingEmployee?.id || !selectedNewRoleCode) return;

    // Find the new role by code for display
    const newRole = roles.find(r => r.code === selectedNewRoleCode);

    setChangingRole(true);
    try {
      // Use dedicated employee role change endpoint
      await employeesApi.changeRole(editingEmployee.id, selectedNewRoleCode);

      toast.success(`Rol "${newRole?.name || selectedNewRoleCode}" ga o'zgartirildi`);
      setIsEditingRole(false);
      setSelectedNewRoleCode('');
      // Reload to get updated data
      loadEmployees();
      // Update local state immediately for better UX
      setEditingEmployee(prev => prev ? { ...prev, userRole: selectedNewRoleCode } : null);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Rolni o\'zgartirishda xatolik yuz berdi');
      console.error('Failed to change role:', error);
    } finally {
      setChangingRole(false);
    }
  };

  const handleCancelRoleEdit = () => {
    setIsEditingRole(false);
    setSelectedNewRoleCode('');
  };

  const handleStartRoleEdit = () => {
    if (editingEmployee?.userRole) {
      setSelectedNewRoleCode(editingEmployee.userRole);
    }
    setIsEditingRole(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title">Xodimlar</h1>
          <p className="section-subtitle">Xodimlar boshqaruvi</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="pill">{totalElements} ta xodim</span>
          <button className="btn btn-primary" onClick={handleOpenNewModal}>
            <Plus className="h-5 w-5" />
            Yangi xodim
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Jami xodimlar</p>
              <p className="text-xl font-bold">{totalElements}</p>
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2.5">
              <UserCheck className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Faol</p>
              <p className="text-xl font-bold text-success">{activeCount}</p>
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-warning/10 p-2.5">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Ta'tilda</p>
              <p className="text-xl font-bold text-warning">{onLeaveCount}</p>
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-info/10 p-2.5">
              <Shield className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Tizim foydalanuvchilari</p>
              <p className="text-xl font-bold text-info">
                {employees.filter(e => e.hasUserAccount).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="surface-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/50">
              Qidiruv
            </h2>
            <p className="text-xs text-base-content/60">
              {hasSearch ? "Qidiruv natijalari ko'rsatilmoqda" : 'Barcha xodimlar'}
            </p>
          </div>
        </div>
        <SearchInput
          value={search}
          onValueChange={(value) => {
            setSearch(value);
            setPage(0);
          }}
          label="Ism, telefon yoki lavozim"
          placeholder="Qidirish..."
          className="mt-4 max-w-md"
        />
      </div>

      {/* Employees Table */}
      <div className="relative">
        {refreshing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-base-100/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <span className="text-sm font-medium text-base-content/70">Yangilanmoqda...</span>
            </div>
          </div>
        )}
        <DataTable
          data={employees}
          columns={columns}
          keyExtractor={(employee) => employee.id}
          loading={initialLoading && !refreshing}
          highlightId={highlightId}
          onHighlightComplete={clearHighlight}
          emptyIcon={<UserCog className="h-12 w-12" />}
          emptyTitle="Xodimlar topilmadi"
          emptyDescription="Yangi xodim qo'shish uchun tugmani bosing"
          rowClassName={(employee) => (employee.status === 'ON_LEAVE' ? 'bg-warning/5' : '')}
          currentPage={page}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          renderMobileCard={(employee) => (
            <div className="surface-panel flex flex-col gap-3 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="avatar placeholder">
                    <div className="w-10 rounded-full bg-primary/15 text-primary">
                      <span>{employee.fullName.charAt(0).toUpperCase()}</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold">{employee.fullName}</p>
                    <p className="text-xs text-base-content/60">{employee.position}</p>
                  </div>
                </div>
                <span className={clsx('badge badge-sm', EMPLOYEE_STATUSES[employee.status]?.color)}>
                  {EMPLOYEE_STATUSES[employee.status]?.label}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-base-content/70">
                  <Phone className="h-4 w-4" />
                  {employee.phone}
                </div>
                {employee.department && (
                  <div className="flex items-center gap-2 text-sm text-base-content/70">
                    <Briefcase className="h-4 w-4" />
                    {employee.department}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-base-200">
                <span className="font-semibold">
                  {employee.salary ? formatCurrency(employee.salary) : '—'}
                </span>
                <button
                  className="btn btn-ghost btn-sm min-h-[44px]"
                  onClick={() => handleOpenEditModal(employee)}
                >
                  Tahrirlash
                </button>
              </div>
            </div>
          )}
        />
      </div>

      {/* Credentials Modal */}
      {newCredentials && (
        <CredentialsModal
          credentials={newCredentials}
          employeeName={credentialsEmployeeName}
          onClose={() => setNewCredentials(null)}
        />
      )}

      {/* Employee Modal with Side Panel */}
      <ModalPortal isOpen={showModal} onClose={handleCloseModal}>
        <div className="flex gap-4 items-stretch">
          {/* Main Modal - Asosiy ma'lumotlar */}
          <div className="w-full max-w-2xl bg-base-100 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold">
                    {editingEmployee ? 'Xodimni tahrirlash' : 'Yangi xodim'}
                  </h3>
                  <p className="text-sm text-base-content/60">
                    {editingEmployee ? "Xodim ma'lumotlarini o'zgartirish" : "Yangi xodim qo'shish"}
                  </p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={handleCloseModal}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Toggle Button for Side Panel */}
              <button
                className={clsx(
                  'mt-4 btn btn-sm gap-2 transition-all',
                  modalTab === 'extended' ? 'btn-primary' : 'btn-ghost border-dashed border-2'
                )}
                onClick={() => setModalTab(modalTab === 'extended' ? 'basic' : 'extended')}
              >
                {modalTab === 'extended' ? (
                  <>
                    <X className="h-4 w-4" />
                    Qo'shimcha yopish
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Qo'shimcha ma'lumotlar
                  </>
                )}
              </button>

              <div className="mt-6 space-y-5">
                {/* Asosiy ma'lumotlar - Always visible */}
                  {/* Asosiy ma'lumotlar */}
                  <div className="surface-soft rounded-xl p-4">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4 flex items-center gap-2">
                      <UserCog className="h-4 w-4" />
                      Shaxsiy ma'lumotlar
                    </h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="form-control sm:col-span-2">
                        <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                          To'liq ism *
                        </span>
                        <input
                          type="text"
                          className="input input-bordered w-full"
                          value={formData.fullName}
                          onChange={(e) => handleFormChange('fullName', e.target.value)}
                          placeholder="Ism Familiya"
                        />
                      </label>
                      <PhoneInput
                        label="Telefon"
                        value={formData.phone}
                        onChange={(value) => handleFormChange('phone', value)}
                        required
                      />
                      <label className="form-control">
                        <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                          Email
                        </span>
                        <input
                          type="email"
                          className="input input-bordered w-full"
                          value={formData.email}
                          onChange={(e) => handleFormChange('email', e.target.value)}
                          placeholder="email@example.com"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Ish ma'lumotlari */}
                  <div className="surface-soft rounded-xl p-4">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4 flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Ish ma'lumotlari
                    </h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="form-control">
                        <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                          Lavozim *
                        </span>
                        <input
                          type="text"
                          className="input input-bordered w-full"
                          value={formData.position}
                          onChange={(e) => handleFormChange('position', e.target.value)}
                          placeholder="Sotuvchi, Kassir..."
                        />
                      </label>
                      <label className="form-control">
                        <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                          Bo'lim
                        </span>
                        <input
                          type="text"
                          className="input input-bordered w-full"
                          value={formData.department}
                          onChange={(e) => handleFormChange('department', e.target.value)}
                          placeholder="Savdo, Ombor..."
                        />
                      </label>
                      <label className="form-control">
                        <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                          Ishga qabul sanasi *
                        </span>
                        <input
                          type="date"
                          className="input input-bordered w-full"
                          value={formData.hireDate}
                          onChange={(e) => handleFormChange('hireDate', e.target.value)}
                        />
                      </label>
                      <label className="form-control">
                        <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                          Maosh
                        </span>
                        <CurrencyInput
                          value={formData.salary || 0}
                          onChange={(value) => handleFormChange('salary', value)}
                          placeholder="0"
                        />
                      </label>
                      <Select
                        label="Status"
                        value={formData.status || 'ACTIVE'}
                        onChange={(value) => handleFormChange('status', value as EmployeeStatus)}
                        options={Object.entries(EMPLOYEE_STATUSES).map(([key, { label }]) => ({
                          value: key,
                          label,
                        }))}
                      />
                    </div>
                  </div>

                  {/* Tizim foydalanuvchisi */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-primary mb-4 flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <Shield className="h-4 w-4" />
                      </div>
                      Tizim kirish huquqi
                    </h4>

                    {/* Show existing user if already linked */}
                    {editingEmployee?.hasUserAccount ? (
                      <div className="space-y-4">
                        {/* Account status header */}
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-success/10 border border-success/20">
                          <div className="p-2 rounded-lg bg-success/20 text-success">
                            <UserCheck className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-success">Akkount faol</p>
                            <p className="text-sm text-success/70">
                              Login: <code className="font-mono">{editingEmployee.username}</code>
                            </p>
                          </div>
                        </div>

                        {/* Role management section */}
                        <div className="p-4 rounded-xl bg-base-100 border border-base-300">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Key className="h-4 w-4 text-base-content/50" />
                              <span className="text-sm font-semibold text-base-content/70">Foydalanuvchi roli</span>
                            </div>
                            {!isEditingRole && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs gap-1"
                                onClick={handleStartRoleEdit}
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                O'zgartirish
                              </button>
                            )}
                          </div>

                          {isEditingRole ? (
                            <div className="space-y-3">
                              <Select
                                label=""
                                value={selectedNewRoleCode}
                                onChange={(value) => setSelectedNewRoleCode(value as string)}
                                placeholder="Yangi rol tanlang..."
                                options={roles.map((role) => ({
                                  value: role.code,
                                  label: role.name,
                                  description: role.description || `${role.permissionCount || 0} ta huquq`,
                                }))}
                              />

                              {/* Role change info */}
                              {selectedNewRoleCode && selectedNewRoleCode !== editingEmployee.userRole && (
                                <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10 border border-warning/20 text-sm">
                                  <AlertCircle className="h-4 w-4 text-warning shrink-0" />
                                  <span className="text-warning">
                                    Rol o'zgartirilganda foydalanuvchi huquqlari yangilanadi
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center justify-end gap-2 pt-2 border-t border-base-200">
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  onClick={handleCancelRoleEdit}
                                  disabled={changingRole}
                                >
                                  Bekor qilish
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={handleChangeRole}
                                  disabled={changingRole || !selectedNewRoleCode || selectedNewRoleCode === editingEmployee.userRole}
                                >
                                  {changingRole ? (
                                    <span className="loading loading-spinner loading-xs" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                  Saqlash
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                                <Shield className="h-4 w-4 text-primary" />
                                <span className="font-medium text-primary">
                                  {roles.find(r => r.code === editingEmployee.userRole)?.name ||
                                   ROLES[editingEmployee.userRole as keyof typeof ROLES]?.label ||
                                   editingEmployee.userRole ||
                                   'Noma\'lum rol'}
                                </span>
                              </div>
                              {roles.find(r => r.code === editingEmployee.userRole)?.permissionCount !== undefined && (
                                <span className="text-sm text-base-content/50">
                                  {roles.find(r => r.code === editingEmployee.userRole)?.permissionCount} ta huquq
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Option 1: No system access */}
                        <label
                          className={clsx(
                            'flex items-start gap-3 cursor-pointer p-4 rounded-xl border-2 transition-all duration-200',
                            accessType === 'none'
                              ? 'border-base-content/30 bg-base-200/50'
                              : 'border-base-300 bg-base-100 hover:border-base-content/30'
                          )}
                        >
                          <input
                            type="radio"
                            name="accessType"
                            className="radio radio-sm mt-0.5"
                            checked={accessType === 'none'}
                            onChange={() => {
                              setAccessType('none');
                              handleFormChange('createUserAccount', false);
                              handleFormChange('userId', undefined);
                              handleFormChange('roleCode', undefined);
                            }}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <UserX className="h-4 w-4 text-base-content/50" />
                              <p className="font-medium text-base-content">Tizimga kirish kerak emas</p>
                            </div>
                            <p className="text-sm text-base-content/50 mt-1">
                              Xodim faqat HR ma'lumotlar bazasida saqlanadi
                            </p>
                          </div>
                        </label>

                        {/* Option 2: Create new account */}
                        <label
                          className={clsx(
                            'flex items-start gap-3 cursor-pointer p-4 rounded-xl border-2 transition-all duration-200',
                            accessType === 'create'
                              ? 'border-primary bg-primary/5'
                              : 'border-base-300 bg-base-100 hover:border-primary/50'
                          )}
                        >
                          <input
                            type="radio"
                            name="accessType"
                            className="radio radio-primary radio-sm mt-0.5"
                            checked={accessType === 'create'}
                            onChange={() => {
                              setAccessType('create');
                              handleFormChange('createUserAccount', true);
                              handleFormChange('userId', undefined);
                            }}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <UserPlus className="h-4 w-4 text-primary" />
                              <p className="font-medium text-base-content">Yangi akkount yaratish</p>
                            </div>
                            <p className="text-sm text-base-content/50 mt-1">
                              Avtomatik login va vaqtinchalik parol generatsiya qilinadi
                            </p>
                          </div>
                        </label>

                        {/* Role selection when creating new user */}
                        {accessType === 'create' && (
                          <div className="ml-7 pl-4 border-l-2 border-primary/30">
                            <Select
                              label="Tizim roli"
                              value={formData.roleCode || ''}
                              onChange={(value) => handleFormChange('roleCode', value as string)}
                              placeholder="Rol tanlang..."
                              options={roles.map((role) => ({
                                value: role.code,
                                label: role.name,
                                description: role.description,
                              }))}
                            />
                          </div>
                        )}

                        {/* Option 3: Link existing account (only show if available users exist) */}
                        {availableUsers.length > 0 && (
                          <>
                            <label
                              className={clsx(
                                'flex items-start gap-3 cursor-pointer p-4 rounded-xl border-2 transition-all duration-200',
                                accessType === 'link'
                                  ? 'border-secondary bg-secondary/5'
                                  : 'border-base-300 bg-base-100 hover:border-secondary/50'
                              )}
                            >
                              <input
                                type="radio"
                                name="accessType"
                                className="radio radio-secondary radio-sm mt-0.5"
                                checked={accessType === 'link'}
                                onChange={() => {
                                  setAccessType('link');
                                  handleFormChange('createUserAccount', false);
                                }}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Link2 className="h-4 w-4 text-secondary" />
                                  <p className="font-medium text-base-content">Mavjud akkountni bog'lash</p>
                                </div>
                                <p className="text-sm text-base-content/50 mt-1">
                                  {availableUsers.length} ta bo'sh akkount mavjud
                                </p>
                              </div>
                            </label>

                            {/* User selection when linking existing */}
                            {accessType === 'link' && (
                              <div className="ml-7 pl-4 border-l-2 border-secondary/30">
                                <Select
                                  label="Foydalanuvchi"
                                  value={formData.userId || ''}
                                  onChange={(value) => handleFormChange('userId', value ? Number(value) : undefined)}
                                  placeholder="Akkount tanlang..."
                                  options={availableUsers.map(user => ({
                                    value: user.id,
                                    label: user.fullName || user.username,
                                    description: `@${user.username} · ${ROLES[user.role]?.label || user.role}`,
                                  }))}
                                />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
              </div>

              <div className="mt-6 flex justify-between gap-2">
                <div>
                  {editingEmployee && (
                    <button
                      className="btn btn-error btn-outline"
                      onClick={handleDeleteEmployee}
                      disabled={saving}
                    >
                      <UserX className="h-4 w-4" />
                      O'chirish
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-ghost" onClick={handleCloseModal} disabled={saving}>
                    Bekor qilish
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveEmployee}
                    disabled={saving || !formData.fullName.trim() || !isValidPhone(formData.phone) || !formData.position.trim()}
                  >
                    {saving && <span className="loading loading-spinner loading-sm" />}
                    {editingEmployee ? 'Yangilash' : 'Saqlash'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel - Qo'shimcha ma'lumotlar */}
          <div
            className={clsx(
              'bg-base-100 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto transition-all duration-300 origin-left',
              modalTab === 'extended'
                ? 'w-[380px] opacity-100 scale-x-100'
                : 'w-0 opacity-0 scale-x-0'
            )}
          >
            {modalTab === 'extended' && (
              <div className="p-4 sm:p-6 min-w-[380px]">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-semibold">Qo'shimcha</h4>
                  <button
                    className="btn btn-ghost btn-sm btn-circle"
                    onClick={() => setModalTab('basic')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-5">
                  {/* Shaxsiy hujjatlar */}
                  <div className="surface-soft rounded-xl p-4">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Shaxsiy hujjatlar
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      <label className="form-control">
                        <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                          Tug'ilgan sana
                        </span>
                        <input
                          type="date"
                          className="input input-bordered w-full"
                          value={formData.birthDate}
                          onChange={(e) => handleFormChange('birthDate', e.target.value)}
                        />
                      </label>
                      <label className="form-control">
                        <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                          Pasport raqami
                        </span>
                        <input
                          type="text"
                          className="input input-bordered w-full"
                          value={formData.passportNumber}
                          onChange={(e) => handleFormChange('passportNumber', e.target.value)}
                          placeholder="AA 1234567"
                        />
                      </label>
                      <label className="form-control">
                        <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                          Manzil
                        </span>
                        <input
                          type="text"
                          className="input input-bordered w-full"
                          value={formData.address}
                          onChange={(e) => handleFormChange('address', e.target.value)}
                          placeholder="Shahar, tuman, ko'cha..."
                        />
                      </label>
                      <label className="form-control">
                        <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                          Bank hisob raqami
                        </span>
                        <input
                          type="text"
                          className="input input-bordered w-full"
                          value={formData.bankAccountNumber}
                          onChange={(e) => handleFormChange('bankAccountNumber', e.target.value)}
                          placeholder="8600 1234 5678 9012"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Favqulodda aloqa */}
                  <div className="surface-soft rounded-xl p-4">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Favqulodda aloqa
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      <label className="form-control">
                        <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                          Ism
                        </span>
                        <input
                          type="text"
                          className="input input-bordered w-full"
                          value={formData.emergencyContactName}
                          onChange={(e) => handleFormChange('emergencyContactName', e.target.value)}
                          placeholder="Yaqin qarindosh ismi"
                        />
                      </label>
                      <PhoneInput
                        label="Telefon"
                        value={formData.emergencyContactPhone || ''}
                        onChange={(value) => handleFormChange('emergencyContactPhone', value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
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
  Clock,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { employeesApi } from '../../api/employees.api';
import { formatCurrency, formatDate, EMPLOYEE_STATUSES, ROLES, getTashkentToday } from '../../config/constants';
import { DataTable, Column } from '../../components/ui/DataTable';
import { ModalPortal } from '../../components/common/Modal';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { CredentialsModal } from './components/CredentialsModal';
import type { CredentialsInfo, Employee, EmployeeRequest, EmployeeStatus, User } from '../../types';

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
  roleCode: 'SELLER',
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

  // Credentials modal for newly created user
  const [newCredentials, setNewCredentials] = useState<CredentialsInfo | null>(null);
  const [credentialsEmployeeName, setCredentialsEmployeeName] = useState('');

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
    loadAvailableUsers();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEmployee(null);
    setFormData(emptyFormData);
    setModalTab('basic');
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
        <label className="form-control mt-4 max-w-md">
          <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
            Ism, telefon yoki lavozim
          </span>
          <div className="input-group">
            <span className="bg-base-200"><Search className="h-5 w-5" /></span>
            <input
              type="text"
              placeholder="Qidirish..."
              className="input input-bordered w-full"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
        </label>
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
          loading={initialLoading}
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

      {/* Employee Modal */}
      <ModalPortal isOpen={showModal} onClose={handleCloseModal}>
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

            {/* Tabs */}
            <div className="tabs tabs-boxed bg-base-200 p-1 mt-4 w-fit">
              <button
                className={clsx('tab', modalTab === 'basic' && 'tab-active')}
                onClick={() => setModalTab('basic')}
              >
                Asosiy
              </button>
              <button
                className={clsx('tab', modalTab === 'extended' && 'tab-active')}
                onClick={() => setModalTab('extended')}
              >
                Qo'shimcha
              </button>
            </div>

            <div className="mt-6 space-y-5">
              {modalTab === 'basic' ? (
                <>
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
                      <label className="form-control">
                        <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                          Status
                        </span>
                        <select
                          className="select select-bordered w-full"
                          value={formData.status || 'ACTIVE'}
                          onChange={(e) => handleFormChange('status', e.target.value as EmployeeStatus)}
                        >
                          {Object.entries(EMPLOYEE_STATUSES).map(([key, { label }]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>

                  {/* Tizim foydalanuvchisi */}
                  <div className="surface-soft rounded-xl p-4">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Tizim kirish huquqi
                    </h4>

                    {/* Show existing user if already linked */}
                    {editingEmployee?.hasUserAccount ? (
                      <div className="alert alert-success">
                        <Shield className="h-5 w-5" />
                        <div>
                          <p className="font-medium">Foydalanuvchi akkaunti mavjud</p>
                          <p className="text-sm">
                            Username: <code className="bg-base-200 px-2 py-0.5 rounded">{editingEmployee.username}</code>
                            {' '} | Rol: {ROLES[editingEmployee.userRole as keyof typeof ROLES]?.label || editingEmployee.userRole}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Create new user account checkbox */}
                        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-base-200/50 transition-colors">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-primary mt-0.5"
                            checked={formData.createUserAccount || false}
                            onChange={(e) => {
                              handleFormChange('createUserAccount', e.target.checked);
                              if (e.target.checked) {
                                handleFormChange('userId', undefined);
                              }
                            }}
                          />
                          <div>
                            <p className="font-medium">Yangi foydalanuvchi hisobi yaratish</p>
                            <p className="text-sm text-base-content/60">
                              Tizim avtomatik username va vaqtinchalik parol generatsiya qiladi
                            </p>
                          </div>
                        </label>

                        {/* Role selection when creating new user */}
                        {formData.createUserAccount && (
                          <label className="form-control">
                            <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                              Rol
                            </span>
                            <select
                              className="select select-bordered w-full"
                              value={formData.roleCode || 'SELLER'}
                              onChange={(e) => handleFormChange('roleCode', e.target.value)}
                            >
                              {Object.entries(ROLES).map(([key, { label }]) => (
                                <option key={key} value={key}>{label}</option>
                              ))}
                            </select>
                          </label>
                        )}

                        {/* Existing user linking (when not creating new) */}
                        {!formData.createUserAccount && (
                          <label className="form-control">
                            <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                              Mavjud akkaunti bog'lash
                            </span>
                            <select
                              className="select select-bordered w-full"
                              value={formData.userId || ''}
                              onChange={(e) => handleFormChange('userId', e.target.value ? Number(e.target.value) : undefined)}
                            >
                              <option value="">Bog'lanmagan</option>
                              {availableUsers.map(user => (
                                <option key={user.id} value={user.id}>
                                  {user.username} ({ROLES[user.role]?.label})
                                </option>
                              ))}
                            </select>
                            <span className="label-text-alt mt-1 text-base-content/50">
                              Mavjud foydalanuvchi akkaunti bilan bog'lash
                            </span>
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Shaxsiy hujjatlar */}
                  <div className="surface-soft rounded-xl p-4">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Shaxsiy hujjatlar
                    </h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                      <label className="form-control sm:col-span-2">
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
                      <label className="form-control sm:col-span-2">
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
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                </>
              )}
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
      </ModalPortal>
    </div>
  );
}

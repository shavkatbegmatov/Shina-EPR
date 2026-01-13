import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Users, Phone, X } from 'lucide-react';
import clsx from 'clsx';
import { customersApi } from '../../api/customers.api';
import { formatCurrency, CUSTOMER_TYPES } from '../../config/constants';
import { DataTable, Column } from '../../components/ui/DataTable';
import { ModalPortal } from '../../components/common/Modal';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { Select } from '../../components/ui/Select';
import { useNotificationsStore } from '../../store/notificationsStore';
import { useHighlight } from '../../hooks/useHighlight';
import type { Customer, CustomerRequest, CustomerType } from '../../types';

const emptyFormData: CustomerRequest = {
  fullName: '',
  phone: '',
  customerType: 'INDIVIDUAL',
};

// Validate phone number: +998 followed by exactly 9 digits
const isValidPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 12 && cleaned.startsWith('998');
};

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerRequest>(emptyFormData);
  const [saving, setSaving] = useState(false);

  const { notifications } = useNotificationsStore();
  const { highlightId, clearHighlight } = useHighlight();
  const hasSearch = useMemo(() => search.trim().length > 0, [search]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  const handleOpenEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      fullName: customer.fullName,
      phone: customer.phone,
      phone2: customer.phone2,
      address: customer.address,
      companyName: customer.companyName,
      customerType: customer.customerType,
      notes: customer.notes,
    });
    setShowModal(true);
  };

  // Table columns
  const columns: Column<Customer>[] = useMemo(() => [
    {
      key: 'fullName',
      header: 'Mijoz',
      render: (customer) => (
        <div className="flex items-center gap-3">
          <div className="avatar placeholder">
            <div className="w-10 rounded-full bg-primary/15 text-primary">
              <span>{customer.fullName.charAt(0).toUpperCase()}</span>
            </div>
          </div>
          <div>
            <div className="font-medium">{customer.fullName}</div>
            {customer.companyName && (
              <div className="text-sm text-base-content/70">{customer.companyName}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Telefon',
      render: (customer) => (
        <div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-base-content/50" />
            {customer.phone}
          </div>
          {customer.phone2 && (
            <div className="text-sm text-base-content/70">{customer.phone2}</div>
          )}
        </div>
      ),
    },
    {
      key: 'customerType',
      header: 'Turi',
      render: (customer) => (
        <span className="badge badge-outline badge-sm">
          {CUSTOMER_TYPES[customer.customerType]?.label}
        </span>
      ),
    },
    {
      key: 'address',
      header: 'Manzil',
      className: 'max-w-xs truncate',
      render: (customer) => customer.address || '-',
    },
    {
      key: 'balance',
      header: 'Balans',
      render: (customer) => (
        <div>
          <span className={clsx('font-medium', customer.balance < 0 && 'text-error', customer.balance > 0 && 'text-success')}>
            {formatCurrency(customer.balance)}
          </span>
          {customer.hasDebt && <span className="badge badge-error badge-sm ml-2">Qarz</span>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      render: (customer) => (
        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); handleOpenEditModal(customer); }}>
          Tahrirlash
        </button>
      ),
    },
  ], []);

  const loadCustomers = useCallback(async (isInitial = false) => {
    if (!isInitial) {
      setRefreshing(true);
    }
    try {
      const data = await customersApi.getAll({
        page,
        size: pageSize,
        search: search || undefined,
      });
      setCustomers(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [page, pageSize, search]);

  // Initial load
  useEffect(() => {
    loadCustomers(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when filters change
  useEffect(() => {
    loadCustomers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search]);

  // WebSocket orqali yangi notification kelganda mijozlarni yangilash
  useEffect(() => {
    if (notifications.length > 0) {
      loadCustomers();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.length]);

  const handleOpenNewModal = () => {
    setEditingCustomer(null);
    setFormData(emptyFormData);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
    setFormData(emptyFormData);
  };

  const handleFormChange = (field: keyof CustomerRequest, value: string | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveCustomer = async () => {
    if (!formData.fullName.trim() || !formData.phone.trim()) return;
    setSaving(true);
    try {
      if (editingCustomer) {
        await customersApi.update(editingCustomer.id, formData);
      } else {
        await customersApi.create(formData);
      }
      handleCloseModal();
      loadCustomers();
    } catch (error) {
      console.error('Failed to save customer:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title">Mijozlar</h1>
          <p className="section-subtitle">Mijozlar bazasi</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="pill">{totalElements} ta mijoz</span>
          <button className="btn btn-primary" onClick={handleOpenNewModal}>
            <Plus className="h-5 w-5" />
            Yangi mijoz
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="surface-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/50">Qidiruv</h2>
            <p className="text-xs text-base-content/60">
              {hasSearch ? "Qidiruv natijalari ko'rsatilmoqda" : 'Barcha mijozlar'}
            </p>
          </div>
        </div>
        <label className="form-control mt-4 max-w-md">
          <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
            Ism yoki telefon
          </span>
          <div className="input-group">
            <span className="bg-base-200"><Search className="h-5 w-5" /></span>
            <input
              type="text"
              placeholder="Ism yoki telefon bo'yicha qidirish..."
              className="input input-bordered w-full"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
        </label>
      </div>

      {/* Customers Table */}
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
          data={customers}
          columns={columns}
          keyExtractor={(customer) => customer.id}
          loading={initialLoading && !refreshing}
          highlightId={highlightId}
          onHighlightComplete={clearHighlight}
          emptyIcon={<Users className="h-12 w-12" />}
          emptyTitle="Mijozlar topilmadi"
          emptyDescription="Qidiruv so'zini o'zgartiring"
          rowClassName={(customer) => (customer.hasDebt ? 'bg-error/5' : '')}
        currentPage={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        renderMobileCard={(customer) => (
          <div className="surface-panel flex flex-col gap-3 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{customer.fullName}</p>
                <p className="text-xs text-base-content/60">{customer.companyName || 'Jismoniy shaxs'}</p>
              </div>
              <span className={clsx('badge badge-sm', customer.hasDebt ? 'badge-error' : 'badge-success')}>
                {customer.hasDebt ? 'Qarz' : 'Toza'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-base-content/70">
              <Phone className="h-4 w-4" />
              {customer.phone}
            </div>
            {customer.address && <p className="text-xs text-base-content/60">{customer.address}</p>}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{formatCurrency(customer.balance)}</span>
              <button className="btn btn-ghost btn-sm min-h-[44px]" onClick={() => handleOpenEditModal(customer)}>
                Tahrirlash
              </button>
            </div>
          </div>
        )}
      />
      </div>

      {/* Customer Modal */}
      <ModalPortal isOpen={showModal} onClose={handleCloseModal}>
        <div className="w-full max-w-lg bg-base-100 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">{editingCustomer ? 'Mijozni tahrirlash' : 'Yangi mijoz'}</h3>
                <p className="text-sm text-base-content/60">
                  {editingCustomer ? "Mijoz ma'lumotlarini o'zgartirish" : "Yangi mijoz qo'shish"}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleCloseModal}><X className="h-4 w-4" /></button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="form-control sm:col-span-2">
                  <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">To'liq ism *</span>
                  <input type="text" className="input input-bordered w-full" value={formData.fullName} onChange={(e) => handleFormChange('fullName', e.target.value)} placeholder="Ism Familiya" />
                </label>
                <PhoneInput
                  label="Telefon"
                  value={formData.phone}
                  onChange={(value) => handleFormChange('phone', value)}
                  required
                />
                <PhoneInput
                  label="Qo'shimcha telefon"
                  value={formData.phone2 || ''}
                  onChange={(value) => handleFormChange('phone2', value || undefined)}
                />
              </div>
              <Select
                label="Mijoz turi"
                value={formData.customerType || 'INDIVIDUAL'}
                onChange={(val) => handleFormChange('customerType', val as CustomerType)}
                options={Object.entries(CUSTOMER_TYPES).map(([key, { label }]) => ({
                  value: key,
                  label,
                }))}
                placeholder="Mijoz turini tanlang"
              />
              {formData.customerType === 'BUSINESS' && (
                <label className="form-control">
                  <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">Kompaniya nomi</span>
                  <input type="text" className="input input-bordered w-full" value={formData.companyName || ''} onChange={(e) => handleFormChange('companyName', e.target.value || undefined)} placeholder="Kompaniya nomi" />
                </label>
              )}
              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">Manzil</span>
                <input type="text" className="input input-bordered w-full" value={formData.address || ''} onChange={(e) => handleFormChange('address', e.target.value || undefined)} placeholder="Shahar, tuman, ko'cha..." />
              </label>
              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">Izoh</span>
                <textarea className="textarea textarea-bordered w-full" rows={2} value={formData.notes || ''} onChange={(e) => handleFormChange('notes', e.target.value || undefined)} placeholder="Qo'shimcha ma'lumot..." />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={handleCloseModal} disabled={saving}>Bekor qilish</button>
              <button className="btn btn-primary" onClick={handleSaveCustomer} disabled={saving || !formData.fullName.trim() || !isValidPhone(formData.phone)}>
                {saving && <span className="loading loading-spinner loading-sm" />}
                {editingCustomer ? 'Yangilash' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}

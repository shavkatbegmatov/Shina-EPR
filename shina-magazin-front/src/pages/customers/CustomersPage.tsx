import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Users, Phone, X } from 'lucide-react';
import clsx from 'clsx';
import { customersApi } from '../../api/customers.api';
import { formatCurrency, CUSTOMER_TYPES } from '../../config/constants';
import { SortableHeader, useSorting, sortData } from '../../components/ui/SortableHeader';
import type { Customer, CustomerRequest, CustomerType } from '../../types';

const emptyFormData: CustomerRequest = {
  fullName: '',
  phone: '',
  customerType: 'INDIVIDUAL',
};

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerRequest>(emptyFormData);
  const [saving, setSaving] = useState(false);

  // Sorting
  const { sortConfig, handleSort } = useSorting();

  const sortedCustomers = useMemo(() => {
    return sortData(customers, sortConfig);
  }, [customers, sortConfig]);

  const hasSearch = useMemo(() => search.trim().length > 0, [search]);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await customersApi.getAll({
        page,
        size: 20,
        search: search || undefined,
      });
      setCustomers(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleOpenNewModal = () => {
    setEditingCustomer(null);
    setFormData(emptyFormData);
    setShowModal(true);
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

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
    setFormData(emptyFormData);
  };

  const handleFormChange = (field: keyof CustomerRequest, value: string | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveCustomer = async () => {
    if (!formData.fullName.trim() || !formData.phone.trim()) {
      return;
    }
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
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/50">
              Qidiruv
            </h2>
            <p className="text-xs text-base-content/60">
              {hasSearch ? "Qidiruv natijalari ko'rsatilmoqda" : 'Barcha mijozlar'}
            </p>
          </div>
          <span className="pill">20 / sahifa</span>
        </div>
        <label className="form-control mt-4 max-w-md">
          <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
            Ism yoki telefon
          </span>
          <div className="input-group">
            <span className="bg-base-200">
              <Search className="h-5 w-5" />
            </span>
            <input
              type="text"
              placeholder="Ism yoki telefon bo'yicha qidirish..."
              className="input input-bordered w-full"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
        </label>
      </div>

      {/* Customers Table */}
      <div className="surface-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-10 text-center text-base-content/50">
            <Users className="h-12 w-12" />
            <div>
              <p className="text-base font-medium">Mijozlar topilmadi</p>
              <p className="text-sm">Qidiruv so'zini o'zgartiring</p>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden lg:block table-container">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <SortableHeader label="Mijoz" sortKey="fullName" currentSort={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Telefon" sortKey="phone" currentSort={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Turi" sortKey="customerType" currentSort={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Manzil" sortKey="address" currentSort={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Balans" sortKey="balance" currentSort={sortConfig} onSort={handleSort} />
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className={clsx(customer.hasDebt && 'bg-error/5')}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="avatar placeholder">
                            <div className="w-10 rounded-full bg-primary/15 text-primary">
                              <span>
                                {customer.fullName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="font-medium">{customer.fullName}</div>
                            {customer.companyName && (
                              <div className="text-sm text-base-content/70">
                                {customer.companyName}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-base-content/50" />
                          {customer.phone}
                        </div>
                        {customer.phone2 && (
                          <div className="text-sm text-base-content/70">
                            {customer.phone2}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-outline badge-sm">
                          {CUSTOMER_TYPES[customer.customerType]?.label}
                        </span>
                      </td>
                      <td className="max-w-xs truncate">
                        {customer.address || '-'}
                      </td>
                      <td>
                        <span
                          className={clsx(
                            'font-medium',
                            customer.balance < 0 && 'text-error',
                            customer.balance > 0 && 'text-success'
                          )}
                        >
                          {formatCurrency(customer.balance)}
                        </span>
                        {customer.hasDebt && (
                          <span className="badge badge-error badge-sm ml-2">
                            Qarz
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleOpenEditModal(customer)}
                        >
                          Tahrirlash
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 lg:hidden">
              {sortedCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="surface-panel flex flex-col gap-3 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{customer.fullName}</p>
                      <p className="text-xs text-base-content/60">
                        {customer.companyName || 'Jismoniy shaxs'}
                      </p>
                    </div>
                    <span
                      className={clsx(
                        'badge badge-sm',
                        customer.hasDebt ? 'badge-error' : 'badge-success'
                      )}
                    >
                      {customer.hasDebt ? 'Qarz' : 'Toza'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-base-content/70">
                    <Phone className="h-4 w-4" />
                    {customer.phone}
                  </div>
                  {customer.address && (
                    <p className="text-xs text-base-content/60">
                      {customer.address}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {formatCurrency(customer.balance)}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm min-h-[44px]"
                      onClick={() => handleOpenEditModal(customer)}
                    >
                      Tahrirlash
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-3 border-t border-base-200 p-4">
            <button
              className="btn btn-ghost btn-sm"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              « Oldingi
            </button>
            <span className="pill">
              Sahifa {page + 1} / {totalPages}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              Keyingi »
            </button>
          </div>
        )}
      </div>

      {/* Customer Modal */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">
                  {editingCustomer ? 'Mijozni tahrirlash' : 'Yangi mijoz'}
                </h3>
                <p className="text-sm text-base-content/60">
                  {editingCustomer ? "Mijoz ma'lumotlarini o'zgartirish" : "Yangi mijoz qo'shish"}
                </p>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleCloseModal}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
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

                <label className="form-control">
                  <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                    Telefon *
                  </span>
                  <input
                    type="tel"
                    className="input input-bordered w-full"
                    value={formData.phone}
                    onChange={(e) => handleFormChange('phone', e.target.value)}
                    placeholder="+998 90 123 45 67"
                  />
                </label>

                <label className="form-control">
                  <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                    Qo'shimcha telefon
                  </span>
                  <input
                    type="tel"
                    className="input input-bordered w-full"
                    value={formData.phone2 || ''}
                    onChange={(e) => handleFormChange('phone2', e.target.value || undefined)}
                    placeholder="+998 90 123 45 67"
                  />
                </label>
              </div>

              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  Mijoz turi
                </span>
                <select
                  className="select select-bordered w-full"
                  value={formData.customerType || 'INDIVIDUAL'}
                  onChange={(e) => handleFormChange('customerType', e.target.value as CustomerType)}
                >
                  {Object.entries(CUSTOMER_TYPES).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              {formData.customerType === 'BUSINESS' && (
                <label className="form-control">
                  <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                    Kompaniya nomi
                  </span>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={formData.companyName || ''}
                    onChange={(e) => handleFormChange('companyName', e.target.value || undefined)}
                    placeholder="Kompaniya nomi"
                  />
                </label>
              )}

              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  Manzil
                </span>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.address || ''}
                  onChange={(e) => handleFormChange('address', e.target.value || undefined)}
                  placeholder="Shahar, tuman, ko'cha..."
                />
              </label>

              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  Izoh
                </span>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => handleFormChange('notes', e.target.value || undefined)}
                  placeholder="Qo'shimcha ma'lumot..."
                />
              </label>
            </div>

            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={handleCloseModal}
                disabled={saving}
              >
                Bekor qilish
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveCustomer}
                disabled={saving || !formData.fullName.trim() || !formData.phone.trim()}
              >
                {saving && <span className="loading loading-spinner loading-sm" />}
                {editingCustomer ? 'Yangilash' : 'Saqlash'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCloseModal} />
        </div>
      )}
    </div>
  );
}

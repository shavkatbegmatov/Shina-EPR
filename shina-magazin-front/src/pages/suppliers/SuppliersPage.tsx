import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Truck,
  Phone,
  Mail,
  MapPin,
  Building2,
  X,
  AlertTriangle,
  Wallet,
  Users,
  CreditCard,
} from 'lucide-react';
import clsx from 'clsx';
import { suppliersApi } from '../../api/suppliers.api';
import { formatCurrency } from '../../config/constants';
import { DataTable, Column } from '../../components/ui/DataTable';
import type { Supplier, SupplierRequest } from '../../types';

const emptyFormData: SupplierRequest = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  bankDetails: '',
  notes: '',
};

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<SupplierRequest>(emptyFormData);
  const [saving, setSaving] = useState(false);

  // Stats
  const [totalDebt, setTotalDebt] = useState(0);
  const [suppliersWithDebt, setSuppliersWithDebt] = useState<Supplier[]>([]);

  const hasSearch = useMemo(() => search.trim().length > 0, [search]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  const handleOpenEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      bankDetails: supplier.bankDetails || '',
      notes: supplier.notes || '',
    });
    setShowModal(true);
  };

  // Table columns
  const columns: Column<Supplier>[] = useMemo(() => [
    {
      key: 'name',
      header: "Ta'minotchi",
      render: (supplier) => (
        <div className="flex items-center gap-3">
          <div className="avatar placeholder">
            <div className="w-10 rounded-full bg-primary/15 text-primary">
              <span>{supplier.name.charAt(0).toUpperCase()}</span>
            </div>
          </div>
          <div>
            <div className="font-medium">{supplier.name}</div>
            {supplier.contactPerson && (
              <div className="text-sm text-base-content/70">{supplier.contactPerson}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: "Aloqa",
      render: (supplier) => (
        <div className="space-y-1">
          {supplier.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-base-content/50" />
              <span className="text-sm">{supplier.phone}</span>
            </div>
          )}
          {supplier.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-base-content/50" />
              <span className="text-sm text-base-content/70">{supplier.email}</span>
            </div>
          )}
          {!supplier.phone && !supplier.email && (
            <span className="text-sm text-base-content/50">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Manzil',
      className: 'max-w-xs',
      render: (supplier) => (
        supplier.address ? (
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-base-content/50 mt-0.5 shrink-0" />
            <span className="text-sm truncate">{supplier.address}</span>
          </div>
        ) : (
          <span className="text-sm text-base-content/50">—</span>
        )
      ),
    },
    {
      key: 'balance',
      header: 'Balans',
      getValue: (supplier) => supplier.balance,
      render: (supplier) => (
        <div>
          <span className={clsx(
            'font-medium',
            supplier.balance > 0 && 'text-error',
            supplier.balance < 0 && 'text-success',
            supplier.balance === 0 && 'text-base-content/70'
          )}>
            {supplier.balance > 0 && '+'}
            {formatCurrency(supplier.balance)}
          </span>
          {supplier.hasDebt && (
            <span className="badge badge-error badge-sm ml-2">Qarz</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      render: (supplier) => (
        <button
          className="btn btn-ghost btn-sm"
          onClick={(e) => { e.stopPropagation(); handleOpenEditModal(supplier); }}
        >
          Tahrirlash
        </button>
      ),
    },
  ], []);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await suppliersApi.getAll({
        page,
        size: pageSize,
        search: search || undefined,
      });
      setSuppliers(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  const loadStats = useCallback(async () => {
    try {
      const [debt, withDebt] = await Promise.all([
        suppliersApi.getTotalDebt(),
        suppliersApi.getWithDebt(),
      ]);
      setTotalDebt(debt);
      setSuppliersWithDebt(withDebt);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleOpenNewModal = () => {
    setEditingSupplier(null);
    setFormData(emptyFormData);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSupplier(null);
    setFormData(emptyFormData);
  };

  const handleFormChange = (field: keyof SupplierRequest, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveSupplier = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      if (editingSupplier) {
        await suppliersApi.update(editingSupplier.id, formData);
      } else {
        await suppliersApi.create(formData);
      }
      handleCloseModal();
      loadSuppliers();
      loadStats();
    } catch (error) {
      console.error('Failed to save supplier:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title">Ta'minotchilar</h1>
          <p className="section-subtitle">Hamkorlar va yetkazib beruvchilar</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="pill">{totalElements} ta ta'minotchi</span>
          <button className="btn btn-primary" onClick={handleOpenNewModal}>
            <Plus className="h-5 w-5" />
            Yangi ta'minotchi
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
              <p className="text-xs text-base-content/60">Jami ta'minotchilar</p>
              <p className="text-xl font-bold">{totalElements}</p>
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-warning/10 p-2.5">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Qarzli ta'minotchilar</p>
              <p className="text-xl font-bold">{suppliersWithDebt.length}</p>
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-error/10 p-2.5">
              <Wallet className="h-5 w-5 text-error" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Jami qarz</p>
              <p className="text-xl font-bold text-error">{formatCurrency(totalDebt)}</p>
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2.5">
              <CreditCard className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Faol hamkorlar</p>
              <p className="text-xl font-bold text-success">{totalElements - suppliersWithDebt.length}</p>
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
              {hasSearch ? "Qidiruv natijalari ko'rsatilmoqda" : "Barcha ta'minotchilar"}
            </p>
          </div>
        </div>
        <label className="form-control mt-4 max-w-md">
          <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
            Nom, telefon yoki email
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

      {/* Suppliers Table */}
      <DataTable
        data={suppliers}
        columns={columns}
        keyExtractor={(supplier) => supplier.id}
        loading={loading}
        emptyIcon={<Truck className="h-12 w-12" />}
        emptyTitle="Ta'minotchilar topilmadi"
        emptyDescription="Qidiruv so'zini o'zgartiring"
        rowClassName={(supplier) => (supplier.hasDebt ? 'bg-error/5' : '')}
        currentPage={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        renderMobileCard={(supplier) => (
          <div className="surface-panel flex flex-col gap-3 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="avatar placeholder">
                  <div className="w-10 rounded-full bg-primary/15 text-primary">
                    <span>{supplier.name.charAt(0).toUpperCase()}</span>
                  </div>
                </div>
                <div>
                  <p className="font-semibold">{supplier.name}</p>
                  <p className="text-xs text-base-content/60">
                    {supplier.contactPerson || "Mas'ul ko'rsatilmagan"}
                  </p>
                </div>
              </div>
              <span className={clsx(
                'badge badge-sm',
                supplier.hasDebt ? 'badge-error' : 'badge-success'
              )}>
                {supplier.hasDebt ? 'Qarz' : 'Toza'}
              </span>
            </div>

            <div className="space-y-1.5">
              {supplier.phone && (
                <div className="flex items-center gap-2 text-sm text-base-content/70">
                  <Phone className="h-4 w-4" />
                  {supplier.phone}
                </div>
              )}
              {supplier.email && (
                <div className="flex items-center gap-2 text-sm text-base-content/70">
                  <Mail className="h-4 w-4" />
                  {supplier.email}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-base-200">
              <span className={clsx(
                'font-semibold',
                supplier.balance > 0 && 'text-error',
                supplier.balance <= 0 && 'text-success'
              )}>
                {supplier.balance > 0 && '+'}
                {formatCurrency(supplier.balance)}
              </span>
              <button
                className="btn btn-ghost btn-sm min-h-[44px]"
                onClick={() => handleOpenEditModal(supplier)}
              >
                Tahrirlash
              </button>
            </div>
          </div>
        )}
      />

      {/* Supplier Modal */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">
                  {editingSupplier ? "Ta'minotchini tahrirlash" : "Yangi ta'minotchi"}
                </h3>
                <p className="text-sm text-base-content/60">
                  {editingSupplier ? "Ta'minotchi ma'lumotlarini o'zgartirish" : "Yangi ta'minotchi qo'shish"}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleCloseModal}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              {/* Asosiy ma'lumotlar */}
              <div className="surface-soft rounded-xl p-4">
                <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Asosiy ma'lumotlar
                </h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="form-control sm:col-span-2">
                    <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                      Ta'minotchi nomi *
                    </span>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={formData.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      placeholder="Kompaniya nomi"
                    />
                  </label>
                  <label className="form-control">
                    <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                      Mas'ul shaxs
                    </span>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={formData.contactPerson}
                      onChange={(e) => handleFormChange('contactPerson', e.target.value)}
                      placeholder="Ism Familiya"
                    />
                  </label>
                  <label className="form-control">
                    <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                      Telefon
                    </span>
                    <input
                      type="tel"
                      className="input input-bordered w-full"
                      value={formData.phone}
                      onChange={(e) => handleFormChange('phone', e.target.value)}
                      placeholder="+998 90 123 45 67"
                    />
                  </label>
                </div>
              </div>

              {/* Aloqa ma'lumotlari */}
              <div className="surface-soft rounded-xl p-4">
                <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Aloqa ma'lumotlari
                </h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                </div>
              </div>

              {/* Qo'shimcha ma'lumotlar */}
              <div className="surface-soft rounded-xl p-4">
                <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Qo'shimcha ma'lumotlar
                </h4>
                <div className="space-y-4">
                  <label className="form-control">
                    <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                      Bank rekvizitlari
                    </span>
                    <textarea
                      className="textarea textarea-bordered w-full"
                      rows={2}
                      value={formData.bankDetails}
                      onChange={(e) => handleFormChange('bankDetails', e.target.value)}
                      placeholder="Bank nomi, hisob raqami, MFO..."
                    />
                  </label>
                  <label className="form-control">
                    <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                      Izoh
                    </span>
                    <textarea
                      className="textarea textarea-bordered w-full"
                      rows={2}
                      value={formData.notes}
                      onChange={(e) => handleFormChange('notes', e.target.value)}
                      placeholder="Qo'shimcha ma'lumot..."
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={handleCloseModal} disabled={saving}>
                Bekor qilish
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveSupplier}
                disabled={saving || !formData.name.trim()}
              >
                {saving && <span className="loading loading-spinner loading-sm" />}
                {editingSupplier ? 'Yangilash' : 'Saqlash'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCloseModal} />
        </div>
      )}
    </div>
  );
}

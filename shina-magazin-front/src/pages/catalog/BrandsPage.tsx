import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../../utils/apiError';
import { Plus, Pencil, Trash2, BadgeCheck } from 'lucide-react';
import { brandsApi } from '../../api/products.api';
import { queryKeys } from '../../lib/queryKeys';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Button, ConfirmDialog, Modal } from '@/ui';
import type { Brand } from '../../types';

interface BrandFormState {
  name: string;
  country: string;
}

const emptyForm: BrandFormState = { name: '', country: '' };

export function BrandsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState<BrandFormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);

  const brandsQuery = useQuery({
    queryKey: queryKeys.brands.list(),
    queryFn: () => brandsApi.getAll(),
  });

  const brands = brandsQuery.data ?? [];
  const loadError = brandsQuery.isError ? getApiErrorMessage(brandsQuery.error) : null;

  /**
   * Brend katalogning boshqa joylarida ham ishlatiladi (mahsulot formasi,
   * vitrina filtri), shuning uchun o'zgarishda `products` ham eskiradi.
   */
  const invalidateBrands = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.brands.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setEditing(brand);
    setForm({ name: brand.name, country: brand.country ?? '' });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const saveMutation = useMutation({
    mutationFn: (data: BrandFormState) => {
      const name = data.name.trim();
      const country = data.country.trim() || undefined;
      return editing ? brandsApi.update(editing.id, name, country) : brandsApi.create(name, country);
    },
    onSuccess: () => {
      toast.success(editing ? t('erp.brands.updated') : t('erp.brands.created'));
      invalidateBrands();
      closeModal();
    },
    onError: (error) => {
      console.error('Failed to save brand:', error);
      toast.error(getApiErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (brand: Brand) => brandsApi.delete(brand.id),
    onSuccess: () => {
      toast.success(t('erp.brands.deleted'));
      invalidateBrands();
      setDeleteTarget(null);
    },
    onError: (error) => {
      console.error('Failed to delete brand:', error);
      toast.error(getApiErrorMessage(error));
    },
  });

  const saving = saveMutation.isPending;
  const deleting = deleteMutation.isPending;

  const handleSave = () => {
    if (!form.name.trim()) return;
    saveMutation.mutate(form);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget);
  };

  const columns: Column<Brand>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('common.name'),
        render: (brand) => <span className="font-medium">{brand.name}</span>,
      },
      {
        key: 'country',
        header: t('erp.brands.colCountry'),
        render: (brand) => brand.country || '—',
      },
      {
        key: 'actions',
        header: '',
        sortable: false,
        render: (brand) => (
          <div className="flex items-center justify-end gap-1">
            <PermissionGate permission={PermissionCode.PRODUCTS_UPDATE}>
              <Button variant="ghost" size="sm" onClick={() => openEdit(brand)} aria-label={t('common.edit')}>
                <Pencil className="h-4 w-4" />
              </Button>
            </PermissionGate>
            <PermissionGate permission={PermissionCode.PRODUCTS_DELETE}>
              <Button
                variant="ghost"
                size="sm"
                className="text-error"
                onClick={() => setDeleteTarget(brand)}
                aria-label={t('common.delete')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </PermissionGate>
          </div>
        ),
      },
    ],
    [t]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title">{t('erp.brands.title')}</h1>
          <p className="section-subtitle">{t('erp.brands.subtitle')}</p>
        </div>
        <PermissionGate permission={PermissionCode.PRODUCTS_CREATE}>
          <Button variant="primary" onClick={openCreate}>
            <Plus className="h-5 w-5" />
            {t('erp.brands.newBrand')}
          </Button>
        </PermissionGate>
      </div>

      <DataTable
        data={brands}
        error={loadError}
        onRetry={() => void brandsQuery.refetch()}
        columns={columns}
        keyExtractor={(brand) => brand.id}
        loading={brandsQuery.isPending}
        emptyIcon={<BadgeCheck className="h-12 w-12" />}
        emptyTitle={t('erp.brands.emptyTitle')}
        emptyDescription={t('erp.brands.emptyDescription')}
        renderMobileCard={(brand) => (
          <div className="surface-panel flex items-center justify-between gap-3 rounded-xl p-4">
            <div>
              <p className="text-sm font-semibold">{brand.name}</p>
              <p className="text-xs text-base-content/60">{brand.country || '—'}</p>
            </div>
            <PermissionGate permission={PermissionCode.PRODUCTS_UPDATE}>
              <Button variant="ghost" size="sm" onClick={() => openEdit(brand)}>
                {t('common.edit')}
              </Button>
            </PermissionGate>
          </div>
        )}
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        size="sm"
        title={editing ? t('erp.brands.editTitle') : t('erp.brands.newBrand')}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving && <span className="loading loading-spinner loading-sm" />}
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="form-control">
            <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
              {t('erp.brands.fieldName')} <span className="text-error">*</span>
            </span>
            <input
              type="text"
              className="input input-bordered w-full"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Michelin"
            />
          </label>
          <label className="form-control">
            <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
              {t('erp.brands.fieldCountry')}
            </span>
            <input
              type="text"
              className="input input-bordered w-full"
              value={form.country}
              onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
              placeholder="Fransiya"
            />
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('erp.brands.deleteTitle')}
        description={t('erp.brands.deleteWarning', { name: deleteTarget?.name ?? '' })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        danger
        loading={deleting}
      />
    </div>
  );
}

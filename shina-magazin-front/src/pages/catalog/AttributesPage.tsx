import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, SlidersHorizontal, GripVertical, X } from 'lucide-react';
import { attributesApi } from '../../api/products.api';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import { Select } from '../../components/ui/Select';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Button, Badge, ConfirmDialog, Modal } from '@/ui';
import type { Attribute, AttributeRequest, AttributeType } from '../../types';

const ATTRIBUTE_TYPES: AttributeType[] = ['SELECT', 'MULTI_SELECT', 'NUMBER', 'BOOLEAN', 'TEXT'];

interface OptionRow {
  id?: number;
  value: string;
}

interface AttributeFormState {
  name: string;
  code: string;
  type: AttributeType;
  unit: string;
  filterable: boolean;
  options: OptionRow[];
}

const emptyForm: AttributeFormState = {
  name: '',
  code: '',
  type: 'SELECT',
  unit: '',
  filterable: true,
  options: [{ value: '' }],
};

export function AttributesPage() {
  const { t } = useTranslation();
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Attribute | null>(null);
  const [form, setForm] = useState<AttributeFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Attribute | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await attributesApi.getAll();
      setAttributes(data);
    } catch (error) {
      console.error('Failed to load attributes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const isSelectable = form.type === 'SELECT' || form.type === 'MULTI_SELECT';

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (attribute: Attribute) => {
    setEditing(attribute);
    setForm({
      name: attribute.name,
      code: attribute.code,
      type: attribute.type,
      unit: attribute.unit ?? '',
      filterable: attribute.filterable,
      options: attribute.options.length
        ? attribute.options.map((o) => ({ id: o.id, value: o.value }))
        : [{ value: '' }],
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const options = form.options
      .map((o) => ({ ...o, value: o.value.trim() }))
      .filter((o) => o.value);
    if (isSelectable && options.length === 0) {
      toast.error(t('erp.attributes.optionsRequired'));
      return;
    }
    setSaving(true);
    try {
      const payload: AttributeRequest = {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        type: form.type,
        unit: form.unit.trim() || undefined,
        filterable: form.filterable,
        options: isSelectable
          ? options.map((o, index) => ({ id: o.id, value: o.value, sortOrder: index }))
          : [],
      };
      if (editing) {
        await attributesApi.update(editing.id, payload);
        toast.success(t('erp.attributes.updated'));
      } else {
        await attributesApi.create(payload);
        toast.success(t('erp.attributes.created'));
      }
      closeModal();
      void load();
    } catch (error) {
      console.error('Failed to save attribute:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await attributesApi.delete(deleteTarget.id);
      toast.success(t('erp.attributes.deleted'));
      setDeleteTarget(null);
      void load();
    } catch (error) {
      console.error('Failed to delete attribute:', error);
    } finally {
      setDeleting(false);
    }
  };

  const typeTone = (type: AttributeType) =>
    type === 'SELECT' || type === 'MULTI_SELECT' ? 'primary' : type === 'NUMBER' ? 'info' : 'neutral';

  const columns: Column<Attribute>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('common.name'),
        render: (attribute) => (
          <div>
            <div className="font-medium">{attribute.name}</div>
            <div className="font-mono text-xs text-base-content/50">{attribute.code}</div>
          </div>
        ),
      },
      {
        key: 'type',
        header: t('erp.attributes.colType'),
        render: (attribute) => (
          <Badge tone={typeTone(attribute.type)}>{t(`erp.attributes.type.${attribute.type}`)}</Badge>
        ),
      },
      {
        key: 'options',
        header: t('erp.attributes.colOptions'),
        sortable: false,
        render: (attribute) =>
          attribute.options.length ? (
            <div className="flex max-w-xs flex-wrap gap-1">
              {attribute.options.slice(0, 4).map((o) => (
                <span key={o.id} className="pill text-xs">{o.value}</span>
              ))}
              {attribute.options.length > 4 && (
                <span className="pill text-xs text-base-content/50">
                  +{attribute.options.length - 4}
                </span>
              )}
            </div>
          ) : (
            <span className="text-base-content/40">—</span>
          ),
      },
      {
        key: 'unit',
        header: t('erp.attributes.colUnit'),
        render: (attribute) => attribute.unit || '—',
      },
      {
        key: 'filterable',
        header: t('erp.attributes.colFilterable'),
        render: (attribute) =>
          attribute.filterable ? (
            <Badge tone="success">{t('common.yes')}</Badge>
          ) : (
            <Badge tone="neutral">{t('common.no')}</Badge>
          ),
      },
      {
        key: 'usage',
        header: t('erp.attributes.colUsage'),
        sortable: false,
        render: (attribute) => (
          <span className="text-xs text-base-content/60">
            {t('erp.attributes.usageInfo', {
              categories: attribute.categoryCount ?? 0,
              products: attribute.valueCount ?? 0,
            })}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        sortable: false,
        render: (attribute) => (
          <div className="flex items-center justify-end gap-1">
            <PermissionGate permission={PermissionCode.PRODUCTS_UPDATE}>
              <Button variant="ghost" size="sm" onClick={() => openEdit(attribute)} aria-label={t('common.edit')}>
                <Pencil className="h-4 w-4" />
              </Button>
            </PermissionGate>
            <PermissionGate permission={PermissionCode.PRODUCTS_DELETE}>
              <Button
                variant="ghost"
                size="sm"
                className="text-error"
                onClick={() => setDeleteTarget(attribute)}
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
          <h1 className="section-title">{t('erp.attributes.title')}</h1>
          <p className="section-subtitle">{t('erp.attributes.subtitle')}</p>
        </div>
        <PermissionGate permission={PermissionCode.PRODUCTS_CREATE}>
          <Button variant="primary" onClick={openCreate}>
            <Plus className="h-5 w-5" />
            {t('erp.attributes.newAttribute')}
          </Button>
        </PermissionGate>
      </div>

      <DataTable
        data={attributes}
        columns={columns}
        keyExtractor={(attribute) => attribute.id}
        loading={loading}
        emptyIcon={<SlidersHorizontal className="h-12 w-12" />}
        emptyTitle={t('erp.attributes.emptyTitle')}
        emptyDescription={t('erp.attributes.emptyDescription')}
        renderMobileCard={(attribute) => (
          <div className="surface-panel flex flex-col gap-3 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{attribute.name}</p>
                <p className="font-mono text-xs text-base-content/50">{attribute.code}</p>
              </div>
              <Badge tone={typeTone(attribute.type)}>{t(`erp.attributes.type.${attribute.type}`)}</Badge>
            </div>
            {attribute.options.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {attribute.options.slice(0, 6).map((o) => (
                  <span key={o.id} className="pill text-xs">{o.value}</span>
                ))}
                {attribute.options.length > 6 && (
                  <span className="pill text-xs text-base-content/50">+{attribute.options.length - 6}</span>
                )}
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-base-content/60">
                {t('erp.attributes.usageInfo', {
                  categories: attribute.categoryCount ?? 0,
                  products: attribute.valueCount ?? 0,
                })}
              </span>
              <div className="flex items-center gap-2">
                <PermissionGate permission={PermissionCode.PRODUCTS_UPDATE}>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(attribute)}>
                    {t('common.edit')}
                  </Button>
                </PermissionGate>
              </div>
            </div>
          </div>
        )}
      />

      {/* Yaratish/tahrirlash modali */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        size="lg"
        title={editing ? t('erp.attributes.editTitle') : t('erp.attributes.newAttribute')}
        description={editing ? t('erp.attributes.editSubtitle') : t('erp.attributes.newSubtitle')}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="form-control">
              <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                {t('erp.attributes.fieldName')} <span className="text-error">*</span>
              </span>
              <input
                type="text"
                className="input input-bordered w-full"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t('erp.attributes.namePlaceholder')}
              />
            </label>
            <label className="form-control">
              <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                {t('erp.attributes.fieldCode')}
              </span>
              <input
                type="text"
                className="input input-bordered w-full font-mono"
                value={form.code}
                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                placeholder={t('erp.attributes.codePlaceholder')}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Select
              label={t('erp.attributes.fieldType')}
              value={form.type}
              onChange={(value) => setForm((prev) => ({ ...prev, type: value as AttributeType }))}
              disabled={Boolean(editing && (editing.valueCount ?? 0) > 0)}
              options={ATTRIBUTE_TYPES.map((type) => ({
                value: type,
                label: t(`erp.attributes.type.${type}`),
              }))}
            />
            <label className="form-control">
              <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                {t('erp.attributes.fieldUnit')}
              </span>
              <input
                type="text"
                className="input input-bordered w-full"
                value={form.unit}
                onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
                placeholder="mm, %, oy..."
              />
            </label>
            <label className="form-control justify-end">
              <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                {t('erp.attributes.fieldFilterable')}
              </span>
              <label className="flex h-12 cursor-pointer items-center gap-2 rounded-xl border border-base-300 px-3">
                <input
                  type="checkbox"
                  className="toggle toggle-primary toggle-sm"
                  checked={form.filterable}
                  onChange={(e) => setForm((prev) => ({ ...prev, filterable: e.target.checked }))}
                />
                <span className="text-sm text-base-content/70">
                  {t('erp.attributes.filterableHint')}
                </span>
              </label>
            </label>
          </div>

          {editing && (editing.valueCount ?? 0) > 0 && (
            <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
              {t('erp.attributes.typeLocked', { count: editing.valueCount })}
            </p>
          )}

          {/* Variantlar muharriri */}
          {isSelectable && (
            <div className="rounded-xl border border-base-300 p-4">
              <h4 className="mb-1 text-sm font-semibold">{t('erp.attributes.optionsTitle')}</h4>
              <p className="mb-3 text-xs text-base-content/60">{t('erp.attributes.optionsHint')}</p>
              <ul className="space-y-2">
                {form.options.map((option, index) => (
                  <li key={option.id ?? `new-${index}`} className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 shrink-0 text-base-content/30" />
                    <input
                      type="text"
                      className="input input-bordered input-sm w-full"
                      value={option.value}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          options: prev.options.map((o, i) =>
                            i === index ? { ...o, value: e.target.value } : o
                          ),
                        }))
                      }
                      placeholder={t('erp.attributes.optionPlaceholder')}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs btn-square text-error"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          options: prev.options.filter((_, i) => i !== index),
                        }))
                      }
                      disabled={form.options.length === 1}
                      aria-label={t('common.delete')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setForm((prev) => ({ ...prev, options: [...prev.options, { value: '' }] }))}
              >
                <Plus className="h-4 w-4" />
                {t('erp.attributes.addOption')}
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* O'chirish dialogi */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('erp.attributes.deleteTitle')}
        description={t('erp.attributes.deleteWarning', {
          name: deleteTarget?.name ?? '',
          count: deleteTarget?.valueCount ?? 0,
        })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        danger
        loading={deleting}
      />
    </div>
  );
}

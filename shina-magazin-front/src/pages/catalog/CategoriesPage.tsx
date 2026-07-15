import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  FolderTree,
  CornerDownRight,
  Link2,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { categoriesApi, attributesApi } from '../../api/products.api';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import { Select } from '../../components/ui/Select';
import { Button, Badge, ConfirmDialog, EmptyState, Modal, Skeleton } from '@/ui';
import {
  flattenCategoryTree,
  collectSubtreeIds,
  indentLabel,
  getCategoryIcon,
  CATEGORY_ICON_CHOICES,
} from '../../utils/categoryTree';
import type {
  Attribute,
  Category,
  CategoryAttribute,
  CategoryAttributeBinding,
  CategoryRequest,
} from '../../types';

interface CategoryFormState {
  name: string;
  description: string;
  parentId?: number;
  icon?: string;
  /** '' = universal mahsulot; 'TIRE' = shina o'lcham maydonlari */
  template: '' | 'TIRE';
}

const emptyForm: CategoryFormState = {
  name: '',
  description: '',
  parentId: undefined,
  icon: undefined,
  template: '',
};

/** Bitta bog'lanish qatori (modal ichidagi atributlar bo'limi) */
interface BindingRow {
  attributeId: number;
  required: boolean;
}

export function CategoriesPage() {
  const { t } = useTranslation();
  const [tree, setTree] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [allAttributes, setAllAttributes] = useState<Attribute[]>([]);

  // Modal holati
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CategoryFormState>(emptyForm);
  const [ownBindings, setOwnBindings] = useState<BindingRow[]>([]);
  const [inheritedAttrs, setInheritedAttrs] = useState<CategoryAttribute[]>([]);
  const [attrToAdd, setAttrToAdd] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);

  // O'chirish dialogi
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadTree = useCallback(async (isInitial = false) => {
    try {
      const data = await categoriesApi.getTree();
      setTree(data);
      if (isInitial) {
        // Boshlanishda 1-daraja ochiq bo'lsin
        setExpanded(new Set(data.map((c) => c.id)));
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTree(true);
    attributesApi.getAll().then(setAllAttributes).catch(console.error);
  }, [loadTree]);

  const flat = useMemo(() => flattenCategoryTree(tree), [tree]);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ─── Modal ochish ───

  const openCreate = (parentId?: number) => {
    setEditingId(null);
    setForm({ ...emptyForm, parentId });
    setOwnBindings([]);
    setAttrToAdd('');
    // Yangi kategoriya ota tanlangan bo'lsa — merosni ko'rsatamiz
    if (parentId) {
      categoriesApi.getAttributes(parentId).then(setInheritedAttrs).catch(() => setInheritedAttrs([]));
    } else {
      setInheritedAttrs([]);
    }
    setModalOpen(true);
  };

  const openEdit = async (category: Category) => {
    setEditingId(category.id);
    setForm({
      name: category.name,
      description: category.description ?? '',
      parentId: category.parentId,
      icon: category.icon,
      template: category.template ?? '',
    });
    setAttrToAdd('');
    try {
      const effective = await categoriesApi.getAttributes(category.id);
      setOwnBindings(
        effective
          .filter((ca) => !ca.inherited)
          .map((ca) => ({ attributeId: ca.attribute.id, required: ca.required }))
      );
      setInheritedAttrs(effective.filter((ca) => ca.inherited));
    } catch {
      setOwnBindings([]);
      setInheritedAttrs([]);
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setOwnBindings([]);
    setInheritedAttrs([]);
  };

  // Ota kategoriya o'zgarganda meros ko'rinishini yangilash
  const handleParentChange = (parentId?: number) => {
    setForm((prev) => ({ ...prev, parentId }));
    if (parentId) {
      categoriesApi.getAttributes(parentId).then(setInheritedAttrs).catch(() => setInheritedAttrs([]));
    } else {
      setInheritedAttrs([]);
    }
  };

  // ─── Saqlash ───

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload: CategoryRequest = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        parentId: form.parentId,
        icon: form.icon,
        template: form.template || null,
      };
      const saved = editingId
        ? await categoriesApi.update(editingId, payload)
        : await categoriesApi.create(payload);

      // Atribut bog'lanishlarini saqlash (o'z bog'lanishlari to'liq almashtiriladi)
      const bindings: CategoryAttributeBinding[] = ownBindings.map((row, index) => ({
        attributeId: row.attributeId,
        required: row.required,
        sortOrder: index,
      }));
      await categoriesApi.updateAttributes(saved.id, bindings);

      toast.success(editingId ? t('erp.categories.updated') : t('erp.categories.created'));
      closeModal();
      void loadTree();
    } catch (error) {
      console.error('Failed to save category:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await categoriesApi.delete(deleteTarget.id);
      toast.success(t('erp.categories.deleted'));
      setDeleteTarget(null);
      void loadTree();
    } catch (error) {
      console.error('Failed to delete category:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleMove = async (id: number, direction: 'up' | 'down') => {
    try {
      const newTree = await categoriesApi.move(id, direction);
      setTree(newTree);
    } catch (error) {
      console.error('Failed to move category:', error);
    }
  };

  // ─── Modal ichidagi atribut bog'lanishlari ───

  const attributeById = useMemo(() => {
    const map = new Map<number, Attribute>();
    allAttributes.forEach((a) => map.set(a.id, a));
    return map;
  }, [allAttributes]);

  const addableAttributes = useMemo(() => {
    const used = new Set<number>([
      ...ownBindings.map((b) => b.attributeId),
      ...inheritedAttrs.map((ca) => ca.attribute.id),
    ]);
    return allAttributes.filter((a) => !used.has(a.id));
  }, [allAttributes, ownBindings, inheritedAttrs]);

  const handleAddBinding = () => {
    if (attrToAdd === '') return;
    setOwnBindings((prev) => [...prev, { attributeId: Number(attrToAdd), required: false }]);
    setAttrToAdd('');
  };

  // Parent select variantlari (tahrirda o'zi va avlodlari chiqarilmaydi)
  const parentOptions = useMemo(() => {
    const blocked = editingId ? collectSubtreeIds(tree, editingId) : new Set<number>();
    return flat
      .filter((c) => !blocked.has(c.id))
      .map((c) => ({ value: c.id, label: indentLabel(c.name, c.depth) }));
  }, [flat, tree, editingId]);

  // ─── Daraxt qatori ───

  const renderNode = (node: Category, depth: number, siblingIndex: number, siblingCount: number) => {
    const hasChildren = Boolean(node.children?.length);
    const isExpanded = expanded.has(node.id);
    const Icon = getCategoryIcon(node.icon);

    return (
      <div key={node.id}>
        <div
          className={clsx(
            'group flex items-center gap-2 rounded-xl border border-transparent px-2 py-2 transition hover:border-base-300/60 hover:bg-base-200/50',
            depth === 0 && 'bg-base-200/20'
          )}
          style={{ marginLeft: depth * 24 }}
        >
          {/* Ochish/yopish */}
          <button
            type="button"
            onClick={() => hasChildren && toggleExpand(node.id)}
            className={clsx(
              'grid h-6 w-6 shrink-0 place-items-center rounded-md transition',
              hasChildren
                ? 'text-base-content/50 hover:bg-base-300/50 hover:text-base-content'
                : 'cursor-default text-transparent'
            )}
            aria-label={isExpanded ? t('erp.categories.collapse') : t('erp.categories.expand')}
            tabIndex={hasChildren ? 0 : -1}
          >
            <ChevronRight className={clsx('h-4 w-4 transition-transform', isExpanded && 'rotate-90')} />
          </button>

          {/* Ikonka */}
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>

          {/* Nomi va tavsifi */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">{node.name}</span>
              {typeof node.productCount === 'number' && node.productCount > 0 && (
                <Badge tone="neutral" className="shrink-0">
                  {t('erp.categories.productBadge', { count: node.productCount })}
                </Badge>
              )}
            </div>
            {node.description && (
              <p className="truncate text-xs text-base-content/50">{node.description}</p>
            )}
          </div>

          {/* Harakatlar */}
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
            <PermissionGate permission={PermissionCode.PRODUCTS_UPDATE}>
              <Button
                variant="ghost"
                size="sm"
                disabled={siblingIndex === 0}
                onClick={() => handleMove(node.id, 'up')}
                aria-label={t('erp.categories.moveUp')}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={siblingIndex === siblingCount - 1}
                onClick={() => handleMove(node.id, 'down')}
                aria-label={t('erp.categories.moveDown')}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PermissionGate>
            <PermissionGate permission={PermissionCode.PRODUCTS_CREATE}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openCreate(node.id)}
                aria-label={t('erp.categories.addChild')}
                title={t('erp.categories.addChild')}
              >
                <CornerDownRight className="h-4 w-4" />
                <Plus className="-ml-2 h-3 w-3" />
              </Button>
            </PermissionGate>
            <PermissionGate permission={PermissionCode.PRODUCTS_UPDATE}>
              <Button variant="ghost" size="sm" onClick={() => void openEdit(node)} aria-label={t('common.edit')}>
                <Pencil className="h-4 w-4" />
              </Button>
            </PermissionGate>
            <PermissionGate permission={PermissionCode.PRODUCTS_DELETE}>
              <Button
                variant="ghost"
                size="sm"
                className="text-error"
                onClick={() => setDeleteTarget(node)}
                aria-label={t('common.delete')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </PermissionGate>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="relative">
            {node.children!.map((child, index) =>
              renderNode(child, depth + 1, index, node.children!.length)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title">{t('erp.categories.title')}</h1>
          <p className="section-subtitle">{t('erp.categories.subtitle')}</p>
        </div>
        <PermissionGate permission={PermissionCode.PRODUCTS_CREATE}>
          <Button variant="primary" onClick={() => openCreate()}>
            <Plus className="h-5 w-5" />
            {t('erp.categories.newCategory')}
          </Button>
        </PermissionGate>
      </div>

      <div className="surface-card p-4">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : tree.length === 0 ? (
          <EmptyState
            icon={FolderTree}
            title={t('erp.categories.emptyTitle')}
            description={t('erp.categories.emptyDescription')}
          />
        ) : (
          <div className="space-y-0.5">
            {tree.map((node, index) => renderNode(node, 0, index, tree.length))}
          </div>
        )}
      </div>

      {/* Yaratish/tahrirlash modali */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        size="lg"
        title={editingId ? t('erp.categories.editTitle') : t('erp.categories.newCategory')}
        description={editingId ? t('erp.categories.editSubtitle') : t('erp.categories.newSubtitle')}
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
                {t('erp.categories.fieldName')} <span className="text-error">*</span>
              </span>
              <input
                type="text"
                className="input input-bordered w-full"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t('erp.categories.namePlaceholder')}
              />
            </label>
            <Select
              label={t('erp.categories.fieldParent')}
              value={form.parentId ?? ''}
              onChange={(value) => handleParentChange(value ? Number(value) : undefined)}
              placeholder={t('erp.categories.rootLevel')}
              options={[{ value: '', label: t('erp.categories.rootLevel') }, ...parentOptions]}
            />
          </div>

          <label className="form-control">
            <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
              {t('erp.categories.fieldDescription')}
            </span>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={t('erp.categories.descriptionPlaceholder')}
            />
          </label>

          {/* Forma shabloni — maxsus maydonlar to'plami (bola kategoriyalarga meros) */}
          <div>
            <Select
              label={t('erp.categories.fieldTemplate')}
              value={form.template}
              onChange={(value) => setForm((prev) => ({ ...prev, template: (value as '' | 'TIRE') || '' }))}
              options={[
                { value: '', label: t('erp.categories.templateNone') },
                { value: 'TIRE', label: t('erp.categories.templateTire') },
              ]}
            />
            <p className="mt-1 text-xs text-base-content/50">{t('erp.categories.templateHint')}</p>
          </div>

          {/* Ikonka tanlash */}
          <div className="form-control">
            <span className="label-text mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
              {t('erp.categories.fieldIcon')}
            </span>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_ICON_CHOICES.map((name) => {
                const Icon = getCategoryIcon(name);
                const selected = form.icon === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, icon: selected ? undefined : name }))}
                    className={clsx(
                      'grid h-10 w-10 place-items-center rounded-xl border transition',
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-base-300 text-base-content/50 hover:border-base-content/30 hover:text-base-content'
                    )}
                    aria-label={name}
                    aria-pressed={selected}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Atributlar bo'limi */}
          <div className="form-card">
            <div className="mb-3 flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold">{t('erp.categories.attributesTitle')}</h4>
            </div>
            <p className="mb-3 text-xs text-base-content/60">{t('erp.categories.attributesHint')}</p>

            {/* Meros atributlar */}
            {inheritedAttrs.length > 0 && (
              <div className="mb-3">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-base-content/40">
                  {t('erp.categories.inheritedAttributes')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {inheritedAttrs.map((ca) => (
                    <span
                      key={ca.attribute.id}
                      className="pill gap-1 text-xs"
                      title={t('erp.categories.inheritedFrom', { name: ca.sourceCategoryName })}
                    >
                      {ca.attribute.name}
                      <span className="text-base-content/40">· {ca.sourceCategoryName}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* O'z bog'lanishlari */}
            {ownBindings.length > 0 && (
              <ul className="mb-3 space-y-1.5">
                {ownBindings.map((row) => {
                  const attr = attributeById.get(row.attributeId);
                  if (!attr) return null;
                  return (
                    <li
                      key={row.attributeId}
                      className="flex items-center gap-3 rounded-lg border border-base-300/60 bg-base-200/30 px-3 py-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{attr.name}</span>
                      <Badge tone="neutral">{t(`erp.attributes.type.${attr.type}`)}</Badge>
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-base-content/70">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-xs checkbox-primary"
                          checked={row.required}
                          onChange={(e) =>
                            setOwnBindings((prev) =>
                              prev.map((b) =>
                                b.attributeId === row.attributeId ? { ...b, required: e.target.checked } : b
                              )
                            )
                          }
                        />
                        {t('erp.categories.requiredFlag')}
                      </label>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs btn-square text-error"
                        onClick={() =>
                          setOwnBindings((prev) => prev.filter((b) => b.attributeId !== row.attributeId))
                        }
                        aria-label={t('common.delete')}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Atribut qo'shish */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Select
                  value={attrToAdd}
                  onChange={(value) => setAttrToAdd(value ? Number(value) : '')}
                  placeholder={t('erp.categories.selectAttribute')}
                  options={addableAttributes.map((a) => ({ value: a.id, label: a.name }))}
                />
              </div>
              <Button variant="outline" onClick={handleAddBinding} disabled={attrToAdd === ''}>
                <Plus className="h-4 w-4" />
                {t('erp.categories.addAttribute')}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* O'chirish dialogi */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('erp.categories.deleteTitle')}
        description={t('erp.categories.deleteWarning', { name: deleteTarget?.name ?? '' })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        danger
        loading={deleting}
      />
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  X,
  Tag,
  FolderTree,
  AlertTriangle,
  Pencil,
  Trash2,
  Palette,
  Sun,
  Moon,
  Monitor,
  Clock,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { brandsApi, categoriesApi } from '../../api/products.api';
import { settingsApi } from '../../api/settings.api';
import { NumberInput } from '../../components/ui/NumberInput';
import { Select } from '../../components/ui/Select';
import { ModalPortal } from '../../components/common/Modal';
import { ExportButtons } from '../../components/common/ExportButtons';
import { useUIStore } from '../../store/uiStore';
import { usePermission, PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import type { Brand, Category } from '../../types';

type Tab = 'appearance' | 'brands' | 'categories' | 'debts';

interface BrandFormData {
  name: string;
  country: string;
}

interface CategoryFormData {
  name: string;
  description: string;
  parentId: number | '';
}

const emptyBrandForm: BrandFormData = { name: '', country: '' };
const emptyCategoryForm: CategoryFormData = { name: '', description: '', parentId: '' };
const DEFAULT_DEBT_DUE_DAYS = 30;

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('appearance');
  const { themeMode, setThemeMode } = useUIStore();
  const { hasPermission } = usePermission();

  // Early return if no VIEW permission - prevents API calls
  if (!hasPermission(PermissionCode.SETTINGS_VIEW)) {
    return null;
  }

  // Brands state
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandForm, setBrandForm] = useState<BrandFormData>(emptyBrandForm);
  const [brandSaving, setBrandSaving] = useState(false);
  const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null);
  const [brandDeleting, setBrandDeleting] = useState(false);

  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>(emptyCategoryForm);
  const [categorySaving, setCategorySaving] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [categoryDeleting, setCategoryDeleting] = useState(false);

  // Debt settings
  const [debtDueDays, setDebtDueDays] = useState(DEFAULT_DEBT_DUE_DAYS);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const data = await settingsApi.get();
      setDebtDueDays(data.debtDueDays);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  // Load brands
  const loadBrands = useCallback(async () => {
    setBrandsLoading(true);
    try {
      const data = await brandsApi.getAll();
      setBrands(data);
    } catch (error) {
      console.error('Failed to load brands:', error);
    } finally {
      setBrandsLoading(false);
    }
  }, []);

  // Load categories
  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const data = await categoriesApi.getAll();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBrands();
    loadCategories();
    loadSettings();
  }, [loadBrands, loadCategories, loadSettings]);

  // Export handlers
  const handleExportBrands = async (format: 'excel' | 'pdf') => {
    await brandsApi.export.exportData(format, {});
  };

  const handleExportCategories = async (format: 'excel' | 'pdf') => {
    await categoriesApi.export.exportData(format, {});
  };

  const handleExportSettings = async (format: 'excel' | 'pdf') => {
    await settingsApi.export.exportData(format, {});
  };

  // Brand handlers
  const handleOpenBrandModal = (brand?: Brand) => {
    if (brand) {
      setEditingBrand(brand);
      setBrandForm({ name: brand.name, country: brand.country || '' });
    } else {
      setEditingBrand(null);
      setBrandForm(emptyBrandForm);
    }
    setShowBrandModal(true);
  };

  const handleCloseBrandModal = () => {
    setShowBrandModal(false);
    setEditingBrand(null);
    setBrandForm(emptyBrandForm);
  };

  const handleSaveBrand = async () => {
    if (!brandForm.name.trim()) return;
    setBrandSaving(true);
    try {
      if (editingBrand) {
        await brandsApi.update(editingBrand.id, brandForm.name, brandForm.country || undefined);
      } else {
        await brandsApi.create(brandForm.name, brandForm.country || undefined);
      }
      handleCloseBrandModal();
      loadBrands();
    } catch (error) {
      console.error('Failed to save brand:', error);
    } finally {
      setBrandSaving(false);
    }
  };

  const handleDeleteBrand = async () => {
    if (!deletingBrand) return;
    setBrandDeleting(true);
    try {
      await brandsApi.delete(deletingBrand.id);
      setDeletingBrand(null);
      loadBrands();
    } catch (error) {
      console.error('Failed to delete brand:', error);
    } finally {
      setBrandDeleting(false);
    }
  };

  // Category handlers
  const handleOpenCategoryModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        description: category.description || '',
        parentId: category.parentId || '',
      });
    } else {
      setEditingCategory(null);
      setCategoryForm(emptyCategoryForm);
    }
    setShowCategoryModal(true);
  };

  const handleCloseCategoryModal = () => {
    setShowCategoryModal(false);
    setEditingCategory(null);
    setCategoryForm(emptyCategoryForm);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) return;
    setCategorySaving(true);
    try {
      if (editingCategory) {
        await categoriesApi.update(
          editingCategory.id,
          categoryForm.name,
          categoryForm.description || undefined,
          categoryForm.parentId || undefined
        );
      } else {
        await categoriesApi.create(
          categoryForm.name,
          categoryForm.description || undefined,
          categoryForm.parentId || undefined
        );
      }
      handleCloseCategoryModal();
      loadCategories();
    } catch (error) {
      console.error('Failed to save category:', error);
    } finally {
      setCategorySaving(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    setCategoryDeleting(true);
    try {
      await categoriesApi.delete(deletingCategory.id);
      setDeletingCategory(null);
      loadCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
    } finally {
      setCategoryDeleting(false);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      const data = await settingsApi.update({ debtDueDays });
      setDebtDueDays(data.debtDueDays);
      toast.success('Sozlamalar yangilandi');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Sozlamalarni saqlashda xatolik');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleDebtDueDaysChange = (value: number | string) => {
    if (typeof value === 'string') {
      if (value === '' || value === '-' || value === '.' || value === '-.') {
        return;
      }
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        setDebtDueDays(parsed);
      }
      return;
    }
    setDebtDueDays(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="section-title">Sozlamalar</h1>
        <p className="section-subtitle">Tizim ma'lumotlarini boshqarish</p>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-bordered">
        <button
          className={clsx('tab gap-2', activeTab === 'appearance' && 'tab-active')}
          onClick={() => setActiveTab('appearance')}
        >
          <Palette className="h-4 w-4" />
          Ko'rinish
        </button>
        <button
          className={clsx('tab gap-2', activeTab === 'brands' && 'tab-active')}
          onClick={() => setActiveTab('brands')}
        >
          <Tag className="h-4 w-4" />
          Brendlar
        </button>
        <button
          className={clsx('tab gap-2', activeTab === 'categories' && 'tab-active')}
          onClick={() => setActiveTab('categories')}
        >
          <FolderTree className="h-4 w-4" />
          Kategoriyalar
        </button>
        <button
          className={clsx('tab gap-2', activeTab === 'debts' && 'tab-active')}
          onClick={() => setActiveTab('debts')}
        >
          <Clock className="h-4 w-4" />
          Qarzlar
        </button>
      </div>

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          {/* Theme Settings */}
          <div className="surface-card p-6">
            <h2 className="text-lg font-semibold mb-4">Mavzu</h2>
            <p className="text-sm text-base-content/60 mb-6">
              Interfeys ranglarini tanlang. Tizim rejimi qurilmangiz sozlamalariga mos keladi.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Light Theme */}
              <button
                className={clsx(
                  'flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all',
                  themeMode === 'light'
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-base-300 hover:border-primary/50 hover:bg-base-200/50'
                )}
                onClick={() => setThemeMode('light')}
              >
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center shadow-inner">
                  <Sun className="h-8 w-8 text-amber-600" />
                </div>
                <div className="text-center">
                  <p className="font-semibold">Yorug'</p>
                  <p className="text-xs text-base-content/50">Kunduzgi rejim</p>
                </div>
                {themeMode === 'light' && (
                  <span className="badge badge-primary badge-sm">Tanlangan</span>
                )}
              </button>

              {/* Dark Theme */}
              <button
                className={clsx(
                  'flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all',
                  themeMode === 'dark'
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-base-300 hover:border-primary/50 hover:bg-base-200/50'
                )}
                onClick={() => setThemeMode('dark')}
              >
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-inner">
                  <Moon className="h-8 w-8 text-slate-300" />
                </div>
                <div className="text-center">
                  <p className="font-semibold">Qorong'i</p>
                  <p className="text-xs text-base-content/50">Tungi rejim</p>
                </div>
                {themeMode === 'dark' && (
                  <span className="badge badge-primary badge-sm">Tanlangan</span>
                )}
              </button>

              {/* System Theme */}
              <button
                className={clsx(
                  'flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all',
                  themeMode === 'system'
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-base-300 hover:border-primary/50 hover:bg-base-200/50'
                )}
                onClick={() => setThemeMode('system')}
              >
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-100 to-purple-200 flex items-center justify-center shadow-inner">
                  <Monitor className="h-8 w-8 text-blue-600" />
                </div>
                <div className="text-center">
                  <p className="font-semibold">Tizim</p>
                  <p className="text-xs text-base-content/50">Avtomatik</p>
                </div>
                {themeMode === 'system' && (
                  <span className="badge badge-primary badge-sm">Tanlangan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Brands Tab */}
      {activeTab === 'brands' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Brendlar</h2>
              <p className="text-sm text-base-content/60">
                {brands.length} ta brend mavjud
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ExportButtons
                onExportExcel={() => handleExportBrands('excel')}
                onExportPdf={() => handleExportBrands('pdf')}
                disabled={brands.length === 0}
                loading={brandsLoading}
              />
              <button className="btn btn-primary" onClick={() => handleOpenBrandModal()}>
                <Plus className="h-5 w-5" />
                Yangi brend
              </button>
            </div>
          </div>

          <div className="surface-card overflow-hidden">
            {brandsLoading ? (
              <div className="flex items-center justify-center h-64">
                <span className="loading loading-spinner loading-lg" />
              </div>
            ) : brands.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-10 text-center text-base-content/50">
                <Tag className="h-12 w-12" />
                <div>
                  <p className="text-base font-medium">Brendlar topilmadi</p>
                  <p className="text-sm">Yangi brend qo'shing</p>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden lg:block table-container">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>Nomi</th>
                        <th>Mamlakat</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {brands.map((brand) => (
                        <tr key={brand.id}>
                          <td className="font-medium">{brand.name}</td>
                          <td>{brand.country || '—'}</td>
                          <td className="text-right space-x-2">
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleOpenBrandModal(brand)}
                            >
                              <Pencil className="h-4 w-4" />
                              Tahrirlash
                            </button>
                            <button
                              className="btn btn-ghost btn-sm text-error"
                              onClick={() => setDeletingBrand(brand)}
                            >
                              <Trash2 className="h-4 w-4" />
                              O'chirish
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="space-y-3 p-4 lg:hidden">
                  {brands.map((brand) => (
                    <div
                      key={brand.id}
                      className="surface-panel flex items-center justify-between gap-3 rounded-xl p-4"
                    >
                      <div>
                        <p className="font-semibold">{brand.name}</p>
                        <p className="text-sm text-base-content/60">
                          {brand.country || 'Mamlakat ko\'rsatilmagan'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleOpenBrandModal(brand)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm text-error"
                          onClick={() => setDeletingBrand(brand)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Kategoriyalar</h2>
              <p className="text-sm text-base-content/60">
                {categories.length} ta kategoriya mavjud
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ExportButtons
                onExportExcel={() => handleExportCategories('excel')}
                onExportPdf={() => handleExportCategories('pdf')}
                disabled={categories.length === 0}
                loading={categoriesLoading}
              />
              <button className="btn btn-primary" onClick={() => handleOpenCategoryModal()}>
                <Plus className="h-5 w-5" />
                Yangi kategoriya
              </button>
            </div>
          </div>

          <div className="surface-card overflow-hidden">
            {categoriesLoading ? (
              <div className="flex items-center justify-center h-64">
                <span className="loading loading-spinner loading-lg" />
              </div>
            ) : categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-10 text-center text-base-content/50">
                <FolderTree className="h-12 w-12" />
                <div>
                  <p className="text-base font-medium">Kategoriyalar topilmadi</p>
                  <p className="text-sm">Yangi kategoriya qo'shing</p>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden lg:block table-container">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>Nomi</th>
                        <th>Tavsif</th>
                        <th>Asosiy kategoriya</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((category) => (
                        <tr key={category.id}>
                          <td className="font-medium">{category.name}</td>
                          <td className="max-w-xs truncate">
                            {category.description || '—'}
                          </td>
                          <td>{category.parentName || '—'}</td>
                          <td className="text-right space-x-2">
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleOpenCategoryModal(category)}
                            >
                              <Pencil className="h-4 w-4" />
                              Tahrirlash
                            </button>
                            <button
                              className="btn btn-ghost btn-sm text-error"
                              onClick={() => setDeletingCategory(category)}
                            >
                              <Trash2 className="h-4 w-4" />
                              O'chirish
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="space-y-3 p-4 lg:hidden">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="surface-panel flex items-center justify-between gap-3 rounded-xl p-4"
                    >
                      <div>
                        <p className="font-semibold">{category.name}</p>
                        <p className="text-sm text-base-content/60">
                          {category.parentName
                            ? `Asosiy: ${category.parentName}`
                            : 'Asosiy kategoriya'}
                        </p>
                        {category.description && (
                          <p className="mt-1 text-xs text-base-content/50 line-clamp-1">
                            {category.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleOpenCategoryModal(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm text-error"
                          onClick={() => setDeletingCategory(category)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Debts Tab */}
      {activeTab === 'debts' && (
        <div className="space-y-4">
          <div className="surface-card p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Qarz sozlamalari</h2>
                <p className="text-sm text-base-content/60">
                  Yangi qarzlar uchun standart muddatni belgilang
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ExportButtons
                  onExportExcel={() => handleExportSettings('excel')}
                  onExportPdf={() => handleExportSettings('pdf')}
                  disabled={settingsLoading}
                  loading={settingsLoading}
                />
                <PermissionGate permission={PermissionCode.SETTINGS_UPDATE}>
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveSettings}
                    disabled={settingsSaving || settingsLoading}
                  >
                    {settingsSaving && <span className="loading loading-spinner loading-sm" />}
                    Saqlash
                  </button>
                </PermissionGate>
              </div>
            </div>

            {settingsLoading ? (
              <div className="mt-6 flex items-center justify-center py-8">
                <span className="loading loading-spinner loading-lg" />
              </div>
            ) : (
              <div className="mt-6 max-w-sm">
                <NumberInput
                  label="Qarz muddati (kun)"
                  value={debtDueDays}
                  onChange={handleDebtDueDaysChange}
                  min={1}
                  max={365}
                  allowEmpty={false}
                />
                <p className="mt-2 text-xs text-base-content/60">
                  Masalan: 30 kun. Bu qiymat faqat yangi qarzlar uchun ishlaydi.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Brand Modal */}
      <ModalPortal isOpen={showBrandModal} onClose={handleCloseBrandModal}>
        <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl">
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">
                  {editingBrand ? 'Brendni tahrirlash' : 'Yangi brend'}
                </h3>
                <p className="text-sm text-base-content/60">
                  {editingBrand
                    ? 'Brend ma\'lumotlarini yangilang'
                    : 'Yangi brend qo\'shing'}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleCloseBrandModal}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  Nomi *
                </span>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={brandForm.name}
                  onChange={(e) => setBrandForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Michelin, Bridgestone..."
                />
              </label>

              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  Mamlakat
                </span>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={brandForm.country}
                  onChange={(e) => setBrandForm((prev) => ({ ...prev, country: e.target.value }))}
                  placeholder="Fransiya, Yaponiya..."
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="btn btn-ghost"
                onClick={handleCloseBrandModal}
                disabled={brandSaving}
              >
                Bekor qilish
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveBrand}
                disabled={brandSaving || !brandForm.name.trim()}
              >
                {brandSaving && <span className="loading loading-spinner loading-sm" />}
                Saqlash
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Category Modal */}
      <ModalPortal isOpen={showCategoryModal} onClose={handleCloseCategoryModal}>
        <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl">
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">
                  {editingCategory ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}
                </h3>
                <p className="text-sm text-base-content/60">
                  {editingCategory
                    ? 'Kategoriya ma\'lumotlarini yangilang'
                    : 'Yangi kategoriya qo\'shing'}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleCloseCategoryModal}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  Nomi *
                </span>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Yengil avtomobil, Yuk mashinasi..."
                />
              </label>

              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  Tavsif
                </span>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={2}
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Kategoriya haqida qisqacha..."
                />
              </label>

              <Select
                label="Asosiy kategoriya"
                value={categoryForm.parentId || undefined}
                onChange={(val) =>
                  setCategoryForm((prev) => ({
                    ...prev,
                    parentId: val ? Number(val) : '',
                  }))
                }
                options={[
                  { value: '', label: "Yo'q (asosiy kategoriya)" },
                  ...categories
                    .filter((c) => c.id !== editingCategory?.id)
                    .map((category) => ({
                      value: category.id,
                      label: category.name,
                    })),
                ]}
                placeholder="Asosiy kategoriyani tanlang"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="btn btn-ghost"
                onClick={handleCloseCategoryModal}
                disabled={categorySaving}
              >
                Bekor qilish
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveCategory}
                disabled={categorySaving || !categoryForm.name.trim()}
              >
                {categorySaving && <span className="loading loading-spinner loading-sm" />}
                Saqlash
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Delete Brand Confirmation Modal */}
      <ModalPortal isOpen={!!deletingBrand} onClose={() => setDeletingBrand(null)}>
        <div className="w-full max-w-sm bg-base-100 rounded-2xl shadow-2xl relative">
          <div className="p-4 sm:p-6">
            <button
              className="btn btn-circle btn-ghost btn-sm absolute right-3 top-3"
              onClick={() => setDeletingBrand(null)}
              disabled={brandDeleting}
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
                <AlertTriangle className="h-6 w-6 text-error" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">O'chirishni tasdiqlang</h3>
                <p className="mt-1 text-sm text-base-content/60">
                  "{deletingBrand?.name}" brendini o'chirmoqchimisiz?
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-center gap-2">
              <button
                className="btn btn-ghost"
                onClick={() => setDeletingBrand(null)}
                disabled={brandDeleting}
              >
                Bekor qilish
              </button>
              <button
                className="btn btn-error"
                onClick={handleDeleteBrand}
                disabled={brandDeleting}
              >
                {brandDeleting && <span className="loading loading-spinner loading-sm" />}
                O'chirish
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Delete Category Confirmation Modal */}
      <ModalPortal isOpen={!!deletingCategory} onClose={() => setDeletingCategory(null)}>
        <div className="w-full max-w-sm bg-base-100 rounded-2xl shadow-2xl relative">
          <div className="p-4 sm:p-6">
            <button
              className="btn btn-circle btn-ghost btn-sm absolute right-3 top-3"
              onClick={() => setDeletingCategory(null)}
              disabled={categoryDeleting}
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
                <AlertTriangle className="h-6 w-6 text-error" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">O'chirishni tasdiqlang</h3>
                <p className="mt-1 text-sm text-base-content/60">
                  "{deletingCategory?.name}" kategoriyasini o'chirmoqchimisiz?
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-center gap-2">
              <button
                className="btn btn-ghost"
                onClick={() => setDeletingCategory(null)}
                disabled={categoryDeleting}
              >
                Bekor qilish
              </button>
              <button
                className="btn btn-error"
                onClick={handleDeleteCategory}
                disabled={categoryDeleting}
              >
                {categoryDeleting && <span className="loading loading-spinner loading-sm" />}
                O'chirish
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}

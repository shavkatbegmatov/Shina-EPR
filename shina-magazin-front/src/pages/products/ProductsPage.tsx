import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Package, BadgeCheck, AlertTriangle, X } from 'lucide-react';
import clsx from 'clsx';
import { productsApi, brandsApi, categoriesApi } from '../../api/products.api';
import { formatCurrency, SEASONS } from '../../config/constants';
import { NumberInput } from '../../components/ui/NumberInput';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { Select } from '../../components/ui/Select';
import { SearchInput } from '../../components/ui/SearchInput';
import { DataTable, Column } from '../../components/ui/DataTable';
import { ModalPortal } from '../../components/common/Modal';
import { useNotificationsStore } from '../../store/notificationsStore';
import { usePermission, PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import { useHighlight } from '../../hooks/useHighlight';
import type { Product, Brand, Category, Season, ProductRequest } from '../../types';

const emptyFormData: ProductRequest = {
  sku: '',
  name: '',
  sellingPrice: 0,
};

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState<number | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('');
  const [seasonFilter, setSeasonFilter] = useState<Season | ''>('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ProductRequest>(emptyFormData);
  const [saving, setSaving] = useState(false);

  const { notifications } = useNotificationsStore();
  const { hasPermission } = usePermission();
  const { highlightId, clearHighlight } = useHighlight();

  // Early return if no VIEW permission - prevents API calls
  if (!hasPermission(PermissionCode.PRODUCTS_VIEW)) {
    return null;
  }

  const activeFilters = useMemo(() => {
    let count = 0;
    if (search.trim()) count += 1;
    if (brandFilter) count += 1;
    if (categoryFilter) count += 1;
    if (seasonFilter) count += 1;
    return count;
  }, [brandFilter, categoryFilter, search, seasonFilter]);

  // Table columns definition
  const columns: Column<Product>[] = useMemo(() => [
    {
      key: 'sku',
      header: 'SKU',
      render: (product) => <span className="font-mono text-sm">{product.sku}</span>,
    },
    {
      key: 'name',
      header: 'Nomi',
      render: (product) => (
        <div>
          <div className="font-medium">{product.name}</div>
          <div className="text-xs text-base-content/60">{product.categoryName || '—'}</div>
        </div>
      ),
    },
    {
      key: 'brandName',
      header: 'Brend',
      render: (product) => product.brandName || '—',
    },
    {
      key: 'sizeString',
      header: "O'lcham",
      render: (product) => product.sizeString || '—',
    },
    {
      key: 'season',
      header: 'Mavsum',
      render: (product) =>
        product.season ? (
          <span className="badge badge-outline badge-sm">{SEASONS[product.season]?.label}</span>
        ) : null,
    },
    {
      key: 'sellingPrice',
      header: 'Narx',
      render: (product) => <span className="font-medium">{formatCurrency(product.sellingPrice)}</span>,
    },
    {
      key: 'quantity',
      header: 'Zaxira',
      render: (product) => (
        <span className={clsx('badge badge-sm', product.lowStock ? 'badge-error' : 'badge-success')}>
          {product.quantity}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      render: (product) => (
        <div className="space-x-2">
          <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); }}>
            Tafsilotlar
          </button>
          <PermissionGate permission={PermissionCode.PRODUCTS_UPDATE}>
            <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); handleEditProduct(product); }}>Tahrirlash</button>
          </PermissionGate>
        </div>
      ),
    },
  ], []);

  const loadData = useCallback(async () => {
    try {
      const [brandsData, categoriesData] = await Promise.all([
        brandsApi.getAll(),
        categoriesApi.getAll(),
      ]);
      setBrands(brandsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  const loadProducts = useCallback(async (isInitial = false) => {
    if (!isInitial) {
      setRefreshing(true);
    }
    try {
      const data = await productsApi.getAll({
        page,
        size: pageSize,
        search: search || undefined,
        brandId: brandFilter || undefined,
        categoryId: categoryFilter || undefined,
        season: seasonFilter || undefined,
      });
      setProducts(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [brandFilter, categoryFilter, page, pageSize, search, seasonFilter]);

  useEffect(() => {
    loadData();
    loadProducts(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when filters change
  useEffect(() => {
    loadProducts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, brandFilter, categoryFilter, seasonFilter]);

  // WebSocket orqali yangi notification kelganda mahsulotlarni yangilash
  useEffect(() => {
    if (notifications.length > 0) {
      loadProducts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.length]);

  const handleResetFilters = () => {
    setSearch('');
    setBrandFilter('');
    setCategoryFilter('');
    setSeasonFilter('');
    setPage(0);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  const handleOpenNewProductModal = () => {
    setFormData(emptyFormData);
    setShowNewProductModal(true);
  };

  const handleCloseNewProductModal = () => {
    setShowNewProductModal(false);
    setEditingProductId(null);
    setFormData(emptyFormData);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setFormData({
      sku: product.sku,
      name: product.name,
      brandId: product.brandId,
      categoryId: product.categoryId,
      width: product.width,
      profile: product.profile,
      diameter: product.diameter,
      loadIndex: product.loadIndex,
      speedRating: product.speedRating,
      season: product.season,
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      quantity: product.quantity,
      minStockLevel: product.minStockLevel,
      description: product.description,
      imageUrl: product.imageUrl,
    });
    setShowNewProductModal(true);
  };

  const handleFormChange = (field: keyof ProductRequest, value: string | number | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProduct = async () => {
    if (!formData.sku.trim() || !formData.name.trim() || formData.sellingPrice <= 0) {
      return;
    }
    setSaving(true);
    try {
      if (editingProductId) {
        await productsApi.update(editingProductId, formData);
      } else {
        await productsApi.create(formData);
      }
      handleCloseNewProductModal();
      loadProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title">Mahsulotlar</h1>
          <p className="section-subtitle">Shina katalogi</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={handleResetFilters}>
              <X className="h-4 w-4" />
              Filtrlarni tozalash
            </button>
          )}
          <PermissionGate permission={PermissionCode.PRODUCTS_CREATE}>
            <button className="btn btn-primary" onClick={handleOpenNewProductModal}>
              <Plus className="h-5 w-5" />
              Yangi mahsulot
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Filters */}
      <div className="surface-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/50">
              Filtrlar
            </h2>
            <p className="text-xs text-base-content/60">
              {activeFilters > 0 ? `${activeFilters} ta filter tanlangan` : "Barcha mahsulotlar ko'rsatilmoqda"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/60">
            <span className="pill">{totalElements} ta mahsulot</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SearchInput
            value={search}
            onValueChange={(value) => {
              setSearch(value);
              setPage(0);
            }}
            label="Qidirish"
            placeholder="SKU, nom yoki o'lcham..."
          />

          <Select
            label="Brend"
            value={brandFilter}
            onChange={(value) => { setBrandFilter(value ? Number(value) : ''); setPage(0); }}
            placeholder="Barcha brendlar"
            options={brands.map((brand) => ({ value: brand.id, label: brand.name }))}
          />

          <Select
            label="Kategoriya"
            value={categoryFilter}
            onChange={(value) => { setCategoryFilter(value ? Number(value) : ''); setPage(0); }}
            placeholder="Barcha kategoriyalar"
            options={categories.map((category) => ({ value: category.id, label: category.name }))}
          />

          <Select
            label="Mavsum"
            value={seasonFilter}
            onChange={(value) => { setSeasonFilter(value as Season | ''); setPage(0); }}
            placeholder="Barcha mavsumlar"
            options={Object.entries(SEASONS).map(([key, { label }]) => ({ value: key, label }))}
          />
        </div>
      </div>

      {/* Products Table */}
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
          data={products}
          columns={columns}
          keyExtractor={(product) => product.id}
          loading={initialLoading && !refreshing}
          highlightId={highlightId}
          onHighlightComplete={clearHighlight}
          emptyIcon={<Package className="h-12 w-12" />}
          emptyTitle="Mahsulotlar topilmadi"
          emptyDescription="Filtrlarni o'zgartirib ko'ring"
          rowClassName={(product) => (product.lowStock ? 'bg-error/5' : '')}
        currentPage={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        renderMobileCard={(product) => (
          <div className="surface-panel flex flex-col gap-3 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{product.name}</p>
                <p className="text-xs text-base-content/60">SKU: {product.sku}</p>
                <p className="text-xs text-base-content/60">{product.sizeString || "O'lcham ko'rsatilmagan"}</p>
              </div>
              <span className={clsx('badge badge-sm', product.lowStock ? 'badge-error' : 'badge-success')}>
                {product.quantity}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/60">
              {product.brandName && <span className="pill">{product.brandName}</span>}
              {product.season && <span className="pill">{SEASONS[product.season]?.label}</span>}
              {product.categoryName && <span className="pill">{product.categoryName}</span>}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-primary">{formatCurrency(product.sellingPrice)}</span>
              <div className="flex items-center gap-2">
                <button className="btn btn-ghost btn-sm min-h-[44px]" onClick={() => setSelectedProduct(product)}>
                  Tafsilotlar
                </button>
                <PermissionGate permission={PermissionCode.PRODUCTS_UPDATE}>
                  <button className="btn btn-ghost btn-sm min-h-[44px]" onClick={() => handleEditProduct(product)}>Tahrirlash</button>
                </PermissionGate>
              </div>
            </div>
          </div>
        )}
      />
      </div>

      {/* Product Detail Modal */}
      <ModalPortal isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)}>
        {selectedProduct && (
          <div className="w-full max-w-3xl bg-base-100 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold">{selectedProduct.name}</h3>
                  <p className="text-sm text-base-content/60">SKU: {selectedProduct.sku}</p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedProduct(null)}>
                  <X className="h-4 w-4" />
                  Yopish
                </button>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
                <div className="surface-soft flex h-48 items-center justify-center rounded-xl">
                  {selectedProduct.imageUrl ? (
                    <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="h-full w-full rounded-xl object-cover" />
                  ) : (
                    <Package className="h-12 w-12 text-base-content/40" />
                  )}
                </div>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/60">
                    {selectedProduct.brandName && <span className="pill">{selectedProduct.brandName}</span>}
                    {selectedProduct.categoryName && <span className="pill">{selectedProduct.categoryName}</span>}
                    {selectedProduct.season && <span className="pill">{SEASONS[selectedProduct.season]?.label}</span>}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="surface-soft rounded-lg p-3">
                      <p className="text-xs text-base-content/60">Narx</p>
                      <p className="text-lg font-semibold text-primary">{formatCurrency(selectedProduct.sellingPrice)}</p>
                    </div>
                    <div className="surface-soft rounded-lg p-3">
                      <p className="text-xs text-base-content/60">Zaxira</p>
                      <div className="flex items-center gap-2">
                        <span className={clsx('badge badge-sm', selectedProduct.lowStock ? 'badge-error' : 'badge-success')}>
                          {selectedProduct.quantity}
                        </span>
                        {selectedProduct.lowStock ? (
                          <span className="flex items-center gap-1 text-xs text-error">
                            <AlertTriangle className="h-4 w-4" />
                            Kam zaxira
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-success">
                            <BadgeCheck className="h-4 w-4" />
                            Yetarli
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm text-base-content/70">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-base-content/40">O'lcham</p>
                      <p className="font-medium">{selectedProduct.sizeString || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-base-content/40">Tezlik / Yuk</p>
                      <p className="font-medium">{selectedProduct.speedRating || '—'} / {selectedProduct.loadIndex || '—'}</p>
                    </div>
                  </div>

                  {selectedProduct.description && (
                    <div className="surface-soft rounded-lg p-3 text-sm text-base-content/70">
                      {selectedProduct.description}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </ModalPortal>

      {/* New Product Modal */}
      <ModalPortal isOpen={showNewProductModal} onClose={handleCloseNewProductModal}>
        <div className="w-full max-w-3xl bg-base-100 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">{editingProductId ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}</h3>
                <p className="text-sm text-base-content/60">{editingProductId ? 'Mahsulot ma\'lumotlarini yangilash' : 'Yangi shina qo\'shish'}</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleCloseNewProductModal}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <label className="form-control">
                  <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">SKU *</span>
                  <input type="text" className="input input-bordered w-full" value={formData.sku} onChange={(e) => handleFormChange('sku', e.target.value)} placeholder="SH-001" />
                </label>
                <label className="form-control sm:col-span-2">
                  <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">Nomi *</span>
                  <input type="text" className="input input-bordered w-full" value={formData.name} onChange={(e) => handleFormChange('name', e.target.value)} placeholder="Michelin Pilot Sport 5" />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select
                  label="Brend"
                  value={formData.brandId || ''}
                  onChange={(value) => handleFormChange('brandId', value ? Number(value) : undefined)}
                  placeholder="Tanlang..."
                  options={brands.map((brand) => ({ value: brand.id, label: brand.name }))}
                />
                <Select
                  label="Kategoriya"
                  value={formData.categoryId || ''}
                  onChange={(value) => handleFormChange('categoryId', value ? Number(value) : undefined)}
                  placeholder="Tanlang..."
                  options={categories.map((category) => ({ value: category.id, label: category.name }))}
                />
              </div>

              <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
                <NumberInput label="Kenglik" value={formData.width ?? ''} onChange={(val) => handleFormChange('width', val === '' ? undefined : Number(val))} placeholder="205" showButtons={false} min={100} max={400} />
                <NumberInput label="Profil" value={formData.profile ?? ''} onChange={(val) => handleFormChange('profile', val === '' ? undefined : Number(val))} placeholder="55" showButtons={false} min={10} max={100} />
                <NumberInput label="Diametr" value={formData.diameter ?? ''} onChange={(val) => handleFormChange('diameter', val === '' ? undefined : Number(val))} placeholder="16" showButtons={false} min={10} max={30} />
                <label className="form-control">
                  <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">Yuk ind.</span>
                  <input type="text" className="input input-bordered w-full" value={formData.loadIndex || ''} onChange={(e) => handleFormChange('loadIndex', e.target.value || undefined)} placeholder="91" />
                </label>
                <label className="form-control">
                  <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">Tezlik</span>
                  <input type="text" className="input input-bordered w-full" value={formData.speedRating || ''} onChange={(e) => handleFormChange('speedRating', e.target.value || undefined)} placeholder="V" />
                </label>
                <Select
                  label="Mavsum"
                  value={formData.season || ''}
                  onChange={(value) => handleFormChange('season', value as Season || undefined)}
                  placeholder="—"
                  options={Object.entries(SEASONS).map(([key, { label }]) => ({ value: key, label }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <CurrencyInput label="Kelish narxi" value={formData.purchasePrice ?? 0} onChange={(val) => handleFormChange('purchasePrice', val || undefined)} min={0} />
                <CurrencyInput label="Sotish narxi *" value={formData.sellingPrice ?? 0} onChange={(val) => handleFormChange('sellingPrice', val)} min={0} />
                <NumberInput label="Miqdor" value={formData.quantity ?? ''} onChange={(val) => handleFormChange('quantity', val === '' ? undefined : Number(val))} placeholder="0" min={0} />
                <NumberInput label="Min zaxira" value={formData.minStockLevel ?? ''} onChange={(val) => handleFormChange('minStockLevel', val === '' ? undefined : Number(val))} placeholder="5" min={0} />
              </div>

              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">Tavsif</span>
                <textarea className="textarea textarea-bordered w-full" rows={2} value={formData.description || ''} onChange={(e) => handleFormChange('description', e.target.value || undefined)} placeholder="Mahsulot haqida qo'shimcha ma'lumot..." />
              </label>

              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">Rasm URL</span>
                <input type="text" className="input input-bordered w-full" value={formData.imageUrl || ''} onChange={(e) => handleFormChange('imageUrl', e.target.value || undefined)} placeholder="https://..." />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={handleCloseNewProductModal} disabled={saving}>Bekor qilish</button>
              <button className="btn btn-primary" onClick={handleSaveProduct} disabled={saving || !formData.sku.trim() || !formData.name.trim() || formData.sellingPrice <= 0}>
                {saving && <span className="loading loading-spinner loading-sm" />}
                Saqlash
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}

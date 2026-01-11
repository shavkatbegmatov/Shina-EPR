import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Package, BadgeCheck, AlertTriangle, X } from 'lucide-react';
import clsx from 'clsx';
import { productsApi, brandsApi, categoriesApi } from '../../api/products.api';
import { formatCurrency, SEASONS } from '../../config/constants';
import { NumberInput } from '../../components/ui/NumberInput';
import { DataTable, Column } from '../../components/ui/DataTable';
import { ModalPortal } from '../../components/common/Modal';
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
  const [loading, setLoading] = useState(true);
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
  const [formData, setFormData] = useState<ProductRequest>(emptyFormData);
  const [saving, setSaving] = useState(false);

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
          <button className="btn btn-ghost btn-sm">Tahrirlash</button>
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

  const loadProducts = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, [brandFilter, categoryFilter, page, pageSize, search, seasonFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

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
    setFormData(emptyFormData);
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
      await productsApi.create(formData);
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
          <button className="btn btn-primary" onClick={handleOpenNewProductModal}>
            <Plus className="h-5 w-5" />
            Yangi mahsulot
          </button>
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
          <label className="form-control">
            <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
              Qidirish
            </span>
            <div className="input-group">
              <span className="bg-base-200">
                <Search className="h-5 w-5" />
              </span>
              <input
                type="text"
                placeholder="SKU, nom yoki o'lcham..."
                className="input input-bordered w-full"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              />
            </div>
          </label>

          <label className="form-control">
            <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
              Brend
            </span>
            <select
              className="select select-bordered w-full"
              value={brandFilter}
              onChange={(e) => { setBrandFilter(e.target.value ? Number(e.target.value) : ''); setPage(0); }}
            >
              <option value="">Barcha brendlar</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>{brand.name}</option>
              ))}
            </select>
          </label>

          <label className="form-control">
            <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
              Kategoriya
            </span>
            <select
              className="select select-bordered w-full"
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value ? Number(e.target.value) : ''); setPage(0); }}
            >
              <option value="">Barcha kategoriyalar</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>

          <label className="form-control">
            <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
              Mavsum
            </span>
            <select
              className="select select-bordered w-full"
              value={seasonFilter}
              onChange={(e) => { setSeasonFilter(e.target.value as Season | ''); setPage(0); }}
            >
              <option value="">Barcha mavsumlar</option>
              {Object.entries(SEASONS).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Products Table */}
      <DataTable
        data={products}
        columns={columns}
        keyExtractor={(product) => product.id}
        loading={loading}
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
                <button className="btn btn-ghost btn-sm min-h-[44px]">Tahrirlash</button>
              </div>
            </div>
          </div>
        )}
      />

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
                <h3 className="text-xl font-semibold">Yangi mahsulot</h3>
                <p className="text-sm text-base-content/60">Yangi shina qo'shish</p>
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
                <label className="form-control">
                  <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">Brend</span>
                  <select className="select select-bordered w-full" value={formData.brandId || ''} onChange={(e) => handleFormChange('brandId', e.target.value ? Number(e.target.value) : undefined)}>
                    <option value="">Tanlang...</option>
                    {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                  </select>
                </label>
                <label className="form-control">
                  <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">Kategoriya</span>
                  <select className="select select-bordered w-full" value={formData.categoryId || ''} onChange={(e) => handleFormChange('categoryId', e.target.value ? Number(e.target.value) : undefined)}>
                    <option value="">Tanlang...</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </label>
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
                <label className="form-control">
                  <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">Mavsum</span>
                  <select className="select select-bordered w-full" value={formData.season || ''} onChange={(e) => handleFormChange('season', e.target.value as Season || undefined)}>
                    <option value="">—</option>
                    {Object.entries(SEASONS).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <NumberInput label="Kelish narxi" value={formData.purchasePrice ?? ''} onChange={(val) => handleFormChange('purchasePrice', val === '' ? undefined : Number(val))} placeholder="0" showButtons={false} min={0} />
                <NumberInput label="Sotish narxi *" value={formData.sellingPrice ?? ''} onChange={(val) => handleFormChange('sellingPrice', val === '' ? 0 : Number(val))} placeholder="0" showButtons={false} min={0} allowEmpty={false} />
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

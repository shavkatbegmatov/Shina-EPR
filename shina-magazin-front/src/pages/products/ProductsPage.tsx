import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Plus,
  Package,
  PackagePlus,
  BadgeCheck,
  AlertTriangle,
  Warehouse,
  X,
  Upload,
  Image as ImageIcon,
  CircleDollarSign,
  Info,
  Ruler,
  SlidersHorizontal,
} from 'lucide-react';
import clsx from 'clsx';
import { productsApi, brandsApi, categoriesApi } from '../../api/products.api';
import { formatCurrency, SEASONS } from '../../config/constants';
import { enumLabel } from '@/shared/enumLabel';
import { NumberInput } from '../../components/ui/NumberInput';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { Select } from '../../components/ui/Select';
import { SearchInput } from '../../components/ui/SearchInput';
import { DataTable, Column } from '../../components/ui/DataTable';
import { ModalPortal } from '../../components/common/Modal';
import { ExportButtons } from '../../components/common/ExportButtons';
import { AttributeValueInputs, type AttributeValueMap } from '../../components/catalog/AttributeValueInputs';
import { flattenCategoryTree, getEffectiveTemplate, indentLabel } from '../../utils/categoryTree';
import { useNotificationsStore } from '../../store/notificationsStore';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import { useHighlight } from '../../hooks/useHighlight';
import type {
  Product,
  Brand,
  Category,
  CategoryAttribute,
  ProductAttributeValue,
  ProductAttributeValueRequest,
  Season,
  ProductRequest,
} from '../../types';
import { Button } from '@/ui';

const emptyFormData: ProductRequest = {
  sku: '',
  name: '',
  sellingPrice: 0,
};

/** Modal ichidagi mantiqiy forma bo'limlari uchun yagona vizual ierarxiya. */
function FormSection({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-card border border-base-200 bg-base-100 p-3 shadow-sm">
      <div className="mb-2.5 flex items-start gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-base-content">{title}</h4>
          {description && <p className="mt-0.5 text-xs leading-5 text-base-content/55">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/** Mahsulot javobidagi atribut qiymatlarini forma xaritasiga aylantiradi */
function toValueMap(attrs?: ProductAttributeValue[]): AttributeValueMap {
  const map: AttributeValueMap = {};
  attrs?.forEach((v) => {
    map[v.attributeId] = {
      attributeId: v.attributeId,
      optionIds: v.optionIds.length ? v.optionIds : undefined,
      valueText: v.valueText,
      valueNumber: v.valueNumber,
      valueBool: v.valueBool,
    };
  });
  return map;
}

export function ProductsPage() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categoryTree, setCategoryTree] = useState<Category[]>([]);
  // Kategoriyaning effektiv (merosi bilan) atributlari — forma uchun
  const [formAttributes, setFormAttributes] = useState<CategoryAttribute[]>([]);
  const [attrValues, setAttrValues] = useState<AttributeValueMap>({});
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
  // Tahrirdagi mahsulotning joriy zaxira/tannarxi — formada ko'rsatish va
  // saqlashda o'zgarishsiz qaytarish uchun (ularni Ombor/Xaridlar boshqaradi)
  const [editingStock, setEditingStock] = useState<number | null>(null);
  const [editingCost, setEditingCost] = useState<number | undefined>(undefined);
  const [formData, setFormData] = useState<ProductRequest>(emptyFormData);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { notifications } = useNotificationsStore();
  const { highlightId, clearHighlight } = useHighlight();

  // Ro'yxat konteksti tanlangan kategoriyaga moslashadi: shinaga tegishli
  // bo'lmagan kategoriya tanlansa Mavsum filtri va O'lcham/Mavsum ustunlari yashirinadi
  const isTireContext = useMemo(
    () => !categoryFilter || getEffectiveTemplate(categoryTree, Number(categoryFilter)) === 'TIRE',
    [categoryTree, categoryFilter]
  );

  const activeFilters = useMemo(() => {
    let count = 0;
    if (search.trim()) count += 1;
    if (brandFilter) count += 1;
    if (categoryFilter) count += 1;
    if (seasonFilter) count += 1;
    return count;
  }, [brandFilter, categoryFilter, search, seasonFilter]);

  // Table columns definition — shina ustunlari (o'lcham/mavsum) kontekstga qarab
  const columns: Column<Product>[] = useMemo(() => [
    {
      key: 'sku',
      header: 'SKU',
      render: (product) => <span className="font-mono text-sm">{product.sku}</span>,
    },
    {
      key: 'name',
      header: t('common.name'),
      render: (product) => (
        <div>
          <div className="font-medium">{product.name}</div>
          <div className="text-xs text-base-content/60">{product.categoryName || '—'}</div>
        </div>
      ),
    },
    {
      key: 'brandName',
      header: t('erp.products.colBrand'),
      render: (product) => product.brandName || '—',
    },
    ...(isTireContext
      ? ([
          {
            key: 'sizeString',
            header: t('erp.products.colSize'),
            render: (product) => product.sizeString || '—',
          },
          {
            key: 'season',
            header: t('erp.products.colSeason'),
            render: (product) =>
              product.season ? (
                <span className="badge badge-outline badge-sm">{enumLabel('season', product.season)}</span>
              ) : null,
          },
        ] as Column<Product>[])
      : []),
    {
      key: 'sellingPrice',
      header: t('erp.products.colPrice'),
      render: (product) => <span className="font-medium">{formatCurrency(product.sellingPrice)}</span>,
    },
    {
      key: 'quantity',
      header: t('erp.products.colStock'),
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
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleShowDetails(product); }}>
            {t('erp.products.details')}
          </Button>
          <PermissionGate permission={PermissionCode.PRODUCTS_UPDATE}>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEditProduct(product); }}>{t('common.edit')}</Button>
          </PermissionGate>
        </div>
      ),
    },
  ], [t, isTireContext]);

  // Shinaga tegishli bo'lmagan kategoriya tanlanganda mavsum filtri eskiradi
  useEffect(() => {
    if (!isTireContext && seasonFilter) {
      setSeasonFilter('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTireContext]);

  const loadData = useCallback(async () => {
    try {
      const [brandsData, treeData] = await Promise.all([
        brandsApi.getAll(),
        categoriesApi.getTree(),
      ]);
      setBrands(brandsData);
      setCategoryTree(treeData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  // Daraxt bo'yicha indentli variantlar (filtr va forma selectlari uchun)
  const categoryOptions = useMemo(
    () =>
      flattenCategoryTree(categoryTree).map((c) => ({
        value: c.id,
        label: indentLabel(c.name, c.depth),
      })),
    [categoryTree]
  );

  // Formada tanlangan kategoriyaning shabloni: TIRE bo'lsagina shina o'lcham
  // maydonlari ko'rinadi — universal magazin (WB) yondashuvi
  const isTireForm = getEffectiveTemplate(categoryTree, formData.categoryId) === 'TIRE';
  const isProductFormValid =
    formData.sku.trim().length > 0 &&
    formData.name.trim().length > 0 &&
    formData.sellingPrice > 0;

  // Tanlangan kategoriyaning effektiv atributlarini yuklash
  const loadFormAttributes = useCallback(async (categoryId?: number) => {
    if (!categoryId) {
      setFormAttributes([]);
      return;
    }
    try {
      setFormAttributes(await categoriesApi.getAttributes(categoryId));
    } catch (error) {
      console.error('Failed to load category attributes:', error);
      setFormAttributes([]);
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
    void loadData();
    void loadProducts(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when filters change
  useEffect(() => {
    void loadProducts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, brandFilter, categoryFilter, seasonFilter]);

  // WebSocket orqali yangi notification kelganda mahsulotlarni yangilash
  useEffect(() => {
    if (notifications.length > 0) {
      void loadProducts();
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
    setFormAttributes([]);
    setAttrValues({});
    setEditingStock(null);
    setEditingCost(undefined);
    setShowNewProductModal(true);
  };

  const handleCloseNewProductModal = () => {
    setShowNewProductModal(false);
    setEditingProductId(null);
    setFormData(emptyFormData);
    setFormAttributes([]);
    setAttrValues({});
    setEditingStock(null);
    setEditingCost(undefined);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    // Zaxira (quantity) va tannarx (purchasePrice) formada YO'Q — ular
    // Ombor kirimi/Xaridlar orqali boshqariladi (yagona manba qoidasi)
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
      sellingPrice: product.sellingPrice,
      minStockLevel: product.minStockLevel,
      description: product.description,
      imageUrl: product.imageUrl,
    });
    setEditingStock(product.quantity);
    setEditingCost(product.purchasePrice);
    setAttrValues({});
    void loadFormAttributes(product.categoryId);
    // Ro'yxat javobida atribut qiymatlari yo'q — to'liq mahsulotni olib kelamiz
    productsApi
      .getById(product.id)
      .then((full) => setAttrValues(toValueMap(full.attributes)))
      .catch((error) => console.error('Failed to load product attributes:', error));
    setShowNewProductModal(true);
  };

  const handleFormChange = (field: keyof ProductRequest, value: string | number | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'categoryId') {
      void loadFormAttributes(typeof value === 'number' ? value : undefined);
    }
  };

  const handleAttrValueChange = (attributeId: number, value?: ProductAttributeValueRequest) => {
    setAttrValues((prev) => {
      const next = { ...prev };
      if (value) next[attributeId] = value;
      else delete next[attributeId];
      return next;
    });
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const url = await productsApi.uploadImage(file);
      setFormData((prev) => ({ ...prev, imageUrl: url }));
      toast.success(t('erp.products.imageUploadSuccess'));
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast.error(t('erp.products.imageUploadError'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!formData.sku.trim() || !formData.name.trim() || formData.sellingPrice <= 0) {
      return;
    }

    // Majburiy atributlar tekshiruvi
    const missing = formAttributes.filter((ca) => ca.required && !attrValues[ca.attribute.id]);
    if (missing.length > 0) {
      toast.error(
        t('erp.products.attrRequired', { names: missing.map((ca) => ca.attribute.name).join(', ') })
      );
      return;
    }

    // Faqat joriy kategoriya (effektiv) atributlariga tegishli qiymatlar yuboriladi
    const allowedIds = new Set(formAttributes.map((ca) => ca.attribute.id));
    const attributes = Object.values(attrValues).filter((v) => allowedIds.has(v.attributeId));

    setSaving(true);
    try {
      const payload: ProductRequest = { ...formData, attributes };
      // Zaxira va tannarx formada TAHRIRLANMAYDI (Ombor/Xaridlar boshqaradi).
      // Tahrirda joriy qiymatlar o'zgarishsiz qaytariladi (backendlar aro moslik),
      // yangi mahsulot esa 0 zaxira bilan boshlanadi.
      payload.quantity = editingProductId ? editingStock ?? undefined : undefined;
      payload.purchasePrice = editingProductId ? editingCost : undefined;
      if (!isTireForm) {
        // Universal mahsulot: shina maydonlari yuborilmaydi (kategoriya
        // almashtirilganda eski shina qiymatlari ham tozalanadi)
        payload.width = undefined;
        payload.profile = undefined;
        payload.diameter = undefined;
        payload.loadIndex = undefined;
        payload.speedRating = undefined;
        payload.season = undefined;
      }
      if (editingProductId) {
        await productsApi.update(editingProductId, payload);
      } else {
        await productsApi.create(payload);
      }
      handleCloseNewProductModal();
      void loadProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
    } finally {
      setSaving(false);
    }
  };

  // Tafsilot modalida atribut qiymatlarini ham ko'rsatish uchun to'liq mahsulotni yuklaymiz
  const handleShowDetails = (product: Product) => {
    setSelectedProduct(product);
    productsApi
      .getById(product.id)
      .then((full) => setSelectedProduct((prev) => (prev && prev.id === full.id ? full : prev)))
      .catch((error) => console.error('Failed to load product details:', error));
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    await productsApi.export.exportData(format, {
      brandId: brandFilter || undefined,
      categoryId: categoryFilter || undefined,
      season: seasonFilter || undefined,
      search: search || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title">{t('erp.products.title')}</h1>
          <p className="section-subtitle">{t('erp.products.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={handleResetFilters}>
              <X className="h-4 w-4" />
              {t('erp.products.clearFilters')}
            </Button>
          )}
          <ExportButtons
            onExportExcel={() => handleExport('excel')}
            onExportPdf={() => handleExport('pdf')}
            disabled={products.length === 0}
            loading={refreshing}
          />
          <PermissionGate permission={PermissionCode.PRODUCTS_CREATE}>
            <Button variant="primary" onClick={handleOpenNewProductModal}>
              <Plus className="h-5 w-5" />
              {t('erp.products.newProduct')}
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Filters */}
      <div className="surface-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/50">
              {t('erp.products.filters')}
            </h2>
            <p className="text-xs text-base-content/60">
              {activeFilters > 0 ? t('erp.products.filtersSelected', { count: activeFilters }) : t('erp.products.allShown')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/60">
            <span className="pill">{t('erp.products.productCount', { count: totalElements })}</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SearchInput
            value={search}
            onValueChange={(value) => {
              setSearch(value);
              setPage(0);
            }}
            label={t('common.search')}
            placeholder={t('erp.products.searchPlaceholder')}
          />

          <Select
            label={t('erp.products.colBrand')}
            value={brandFilter}
            onChange={(value) => { setBrandFilter(value ? Number(value) : ''); setPage(0); }}
            placeholder={t('erp.products.allBrands')}
            options={brands.map((brand) => ({ value: brand.id, label: brand.name }))}
          />

          <Select
            label={t('erp.products.category')}
            value={categoryFilter}
            onChange={(value) => { setCategoryFilter(value ? Number(value) : ''); setPage(0); }}
            placeholder={t('erp.products.allCategories')}
            options={categoryOptions}
          />

          {isTireContext && (
            <Select
              label={t('erp.products.colSeason')}
              value={seasonFilter}
              onChange={(value) => { setSeasonFilter(value as Season | ''); setPage(0); }}
              placeholder={t('erp.products.allSeasons')}
              options={Object.entries(SEASONS).map(([key, { label }]) => ({ value: key, label }))}
            />
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="relative">
        {refreshing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-base-100/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <span className="text-sm font-medium text-base-content/70">{t('erp.products.refreshing')}</span>
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
          emptyTitle={t('erp.products.emptyTitle')}
          emptyDescription={t('erp.products.emptyDescription')}
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
                {product.sizeString && <p className="text-xs text-base-content/60">{product.sizeString}</p>}
              </div>
              <span className={clsx('badge badge-sm', product.lowStock ? 'badge-error' : 'badge-success')}>
                {product.quantity}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/60">
              {product.brandName && <span className="pill">{product.brandName}</span>}
              {product.season && <span className="pill">{enumLabel('season', product.season)}</span>}
              {product.categoryName && <span className="pill">{product.categoryName}</span>}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-primary">{formatCurrency(product.sellingPrice)}</span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="min-h-[44px]" onClick={() => handleShowDetails(product)}>
                  {t('erp.products.details')}
                </Button>
                <PermissionGate permission={PermissionCode.PRODUCTS_UPDATE}>
                  <Button variant="ghost" size="sm" className="min-h-[44px]" onClick={() => handleEditProduct(product)}>{t('common.edit')}</Button>
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
                <Button variant="ghost" size="sm" onClick={() => setSelectedProduct(null)}>
                  <X className="h-4 w-4" />
                  {t('common.close')}
                </Button>
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
                    {selectedProduct.season && <span className="pill">{enumLabel('season', selectedProduct.season)}</span>}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="surface-soft rounded-lg p-3">
                      <p className="text-xs text-base-content/60">{t('erp.products.colPrice')}</p>
                      <p className="text-lg font-semibold text-primary">{formatCurrency(selectedProduct.sellingPrice)}</p>
                    </div>
                    <div className="surface-soft rounded-lg p-3">
                      <p className="text-xs text-base-content/60">{t('erp.products.colStock')}</p>
                      <div className="flex items-center gap-2">
                        <span className={clsx('badge badge-sm', selectedProduct.lowStock ? 'badge-error' : 'badge-success')}>
                          {selectedProduct.quantity}
                        </span>
                        {selectedProduct.lowStock ? (
                          <span className="flex items-center gap-1 text-xs text-error">
                            <AlertTriangle className="h-4 w-4" />
                            {t('erp.products.lowStock')}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-success">
                            <BadgeCheck className="h-4 w-4" />
                            {t('erp.products.inStock')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Shina o'lchamlari — faqat qiymat mavjud bo'lsa (universal mahsulotlarda chiqmaydi) */}
                  {(selectedProduct.sizeString || selectedProduct.speedRating || selectedProduct.loadIndex) && (
                    <div className="grid grid-cols-2 gap-3 text-sm text-base-content/70">
                      {selectedProduct.sizeString && (
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-base-content/40">{t('erp.products.colSize')}</p>
                          <p className="font-medium">{selectedProduct.sizeString}</p>
                        </div>
                      )}
                      {(selectedProduct.speedRating || selectedProduct.loadIndex) && (
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-base-content/40">{t('erp.products.speedLoad')}</p>
                          <p className="font-medium">{selectedProduct.speedRating || '—'} / {selectedProduct.loadIndex || '—'}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedProduct.description && (
                    <div className="surface-soft rounded-lg p-3 text-sm text-base-content/70">
                      {selectedProduct.description}
                    </div>
                  )}

                  {/* Xususiyatlar (atributlar) */}
                  {selectedProduct.attributes && selectedProduct.attributes.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-base-content/40">
                        {t('erp.products.characteristics')}
                      </p>
                      <dl className="divide-y divide-base-200 overflow-hidden rounded-lg border border-base-200 text-sm">
                        {selectedProduct.attributes.map((attr) => (
                          <div key={attr.attributeId} className="flex items-center justify-between gap-4 px-3 py-2">
                            <dt className="text-base-content/60">{attr.name}</dt>
                            <dd className="text-right font-medium">{attr.values.join(', ') || '—'}</dd>
                          </div>
                        ))}
                      </dl>
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
        <div
          className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-5xl flex-col overflow-hidden rounded-2xl bg-base-100 shadow-strong animate-fade-up"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-form-title"
        >
          {/* Sarlavha — kontent aylanganda ham tepada qoladi */}
          <div className="shrink-0 border-b border-base-200 bg-base-100 px-4 py-3 sm:px-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <PackagePlus className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 id="product-form-title" className="text-xl font-semibold">{editingProductId ? t('erp.products.editTitle') : t('erp.products.newProduct')}</h3>
                  <p className="mt-0.5 text-sm text-base-content/60">{editingProductId ? t('erp.products.editSubtitle') : t('erp.products.newSubtitle')}</p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" iconOnly className="shrink-0" onClick={handleCloseNewProductModal} aria-label={t('common.close')}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSaveProduct();
            }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-base-200/30 p-3">
              <div className="space-y-2.5">
              {/* 1. Asosiy ma'lumotlar */}
              <FormSection title={t('erp.products.sectionMain')} icon={<Package className="h-4 w-4" />}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                  <label className="form-control sm:col-span-4 lg:col-span-3">
                    <span className="form-label">SKU <span className="text-error">*</span></span>
                    <input type="text" name="sku" className="input input-bordered w-full" value={formData.sku} onChange={(e) => handleFormChange('sku', e.target.value)} placeholder="SH-001" required autoFocus={!editingProductId} />
                  </label>
                  <label className="form-control sm:col-span-8 lg:col-span-4">
                    <span className="form-label">{t('erp.products.fieldName')} <span className="text-error">*</span></span>
                    <input type="text" name="productName" className="input input-bordered w-full" value={formData.name} onChange={(e) => handleFormChange('name', e.target.value)} placeholder="Michelin Pilot Sport 5" required />
                  </label>
                  <Select
                    className="sm:col-span-6 lg:col-span-2"
                    label={t('erp.products.colBrand')}
                    value={formData.brandId || ''}
                    onChange={(value) => handleFormChange('brandId', value ? Number(value) : undefined)}
                    placeholder={t('erp.products.selectPlaceholder')}
                    options={brands.map((brand) => ({ value: brand.id, label: brand.name }))}
                  />
                  <Select
                    className="sm:col-span-6 lg:col-span-3"
                    label={t('erp.products.category')}
                    value={formData.categoryId || ''}
                    onChange={(value) => handleFormChange('categoryId', value ? Number(value) : undefined)}
                    placeholder={t('erp.products.selectPlaceholder')}
                    options={categoryOptions}
                  />
                </div>
              </FormSection>
              {/* 2. Shina o'lchamlari — faqat TIRE shablonli kategoriyada (universal magazin) */}
              {isTireForm && (
                <FormSection title={t('erp.products.sectionTire')} icon={<Ruler className="h-4 w-4" />}>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <NumberInput label={t('erp.products.fieldWidth')} value={formData.width ?? ''} onChange={(val) => handleFormChange('width', val === '' ? undefined : Number(val))} placeholder="205" showButtons={false} min={100} max={400} />
                    <NumberInput label={t('erp.products.fieldProfile')} value={formData.profile ?? ''} onChange={(val) => handleFormChange('profile', val === '' ? undefined : Number(val))} placeholder="55" showButtons={false} min={10} max={100} />
                    <NumberInput label={t('erp.products.fieldDiameter')} value={formData.diameter ?? ''} onChange={(val) => handleFormChange('diameter', val === '' ? undefined : Number(val))} placeholder="16" showButtons={false} min={10} max={30} />
                    <label className="form-control">
                      <span className="form-label">{t('erp.products.fieldLoadIndex')}</span>
                      <input type="text" className="input input-bordered w-full" value={formData.loadIndex || ''} onChange={(e) => handleFormChange('loadIndex', e.target.value || undefined)} placeholder="91" />
                    </label>
                    <label className="form-control">
                      <span className="form-label">{t('erp.products.fieldSpeed')}</span>
                      <input type="text" className="input input-bordered w-full" value={formData.speedRating || ''} onChange={(e) => handleFormChange('speedRating', e.target.value || undefined)} placeholder="V" />
                    </label>
                    <Select
                      label={t('erp.products.colSeason')}
                      value={formData.season || ''}
                      onChange={(value) => handleFormChange('season', value as Season || undefined)}
                      placeholder="—"
                      options={Object.entries(SEASONS).map(([key, { label }]) => ({ value: key, label }))}
                    />
                  </div>
                </FormSection>
              )}

              {/* 3. Kategoriya xususiyatlari (dinamik, merosi bilan) */}
              {formData.categoryId && formAttributes.length > 0 && (
                <FormSection
                  title={t('erp.products.attributesSection')}
                  description={t('erp.products.attributesSectionHint')}
                  icon={<SlidersHorizontal className="h-4 w-4" />}
                >
                  <AttributeValueInputs
                    attributes={formAttributes}
                    values={attrValues}
                    onChange={handleAttrValueChange}
                  />
                </FormSection>
              )}
              {/* 4. Narx va zaxira siyosati — zaxira/tannarx Ombor va Xaridlar orqali */}
              <FormSection title={t('erp.products.sectionPricing')} icon={<CircleDollarSign className="h-4 w-4" />}>
                <div className="space-y-3">
                  <div className={clsx('grid grid-cols-1 gap-3', editingProductId ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
                    <CurrencyInput label={t('erp.products.fieldSellingPrice')} value={formData.sellingPrice ?? 0} onChange={(val) => handleFormChange('sellingPrice', val)} min={0} required />
                    <NumberInput label={t('erp.products.fieldMinStock')} value={formData.minStockLevel ?? ''} onChange={(val) => handleFormChange('minStockLevel', val === '' ? undefined : Number(val))} placeholder="5" min={0} />
                    {editingProductId && (
                      <div className="form-control">
                        <span className="form-label">
                          {t('erp.products.currentStock')}
                        </span>
                        <div className="flex h-12 items-center gap-2 rounded-xl border border-base-300 bg-base-200/50 px-3">
                          <Warehouse className="h-4 w-4 shrink-0 text-base-content/40" />
                          <span className="font-semibold">{editingStock ?? 0}</span>
                          <span className="text-xs text-base-content/50">{t('erp.products.stockUnit')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-start gap-2 rounded-xl border border-info/20 bg-info/10 p-2 text-xs leading-5 text-base-content/65">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                    <p>{editingProductId ? t('erp.products.stockManagedHint') : t('erp.products.newStockHint')}</p>
                  </div>
                </div>
              </FormSection>

              {/* 5. Tavsif va rasm */}
              <FormSection title={t('erp.products.sectionMedia')} icon={<ImageIcon className="h-4 w-4" />}>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <label className="form-control">
                    <span className="form-label">{t('erp.products.fieldDescription')}</span>
                    <textarea className="textarea textarea-bordered min-h-20 w-full resize-y" value={formData.description || ''} onChange={(e) => handleFormChange('description', e.target.value || undefined)} placeholder={t('erp.products.descriptionPlaceholder')} />
                  </label>

                  <div className="form-control min-w-0">
                    <span className="form-label">{t('erp.products.fieldImageUrl')}</span>
                    <div className="flex items-start gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleImageUpload(f);
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        className="group relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-base-300 bg-base-200/40 transition hover:border-primary hover:bg-primary/5 focus-visible:border-primary disabled:cursor-wait"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        aria-label={t('erp.products.uploadImage')}
                      >
                        {formData.imageUrl ? (
                          <img src={formData.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                        ) : (
                          <span className="flex flex-col items-center gap-1.5 px-2 text-xs text-base-content/50">
                            <span className="grid h-9 w-9 place-items-center rounded-full bg-base-200 text-base-content/40 transition group-hover:bg-primary/10 group-hover:text-primary">
                              {uploadingImage ? <span className="loading loading-spinner loading-sm" /> : <Upload className="h-4 w-4" />}
                            </span>
                            {t('erp.products.uploadImage')}
                          </span>
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <input
                          type="url"
                          className="input input-bordered w-full"
                          value={formData.imageUrl || ''}
                          onChange={(e) => handleFormChange('imageUrl', e.target.value || undefined)}
                          placeholder="https://..."
                          aria-label={t('erp.products.fieldImageUrl')}
                        />
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="min-w-0 text-xs leading-4 text-base-content/45">{t('erp.products.imageUploadHint')}</span>
                          {formData.imageUrl && (
                            <Button type="button" variant="ghost" size="sm" iconOnly className="shrink-0 text-error" onClick={() => handleFormChange('imageUrl', undefined)} aria-label={t('erp.products.imageRemove')}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </FormSection>
              </div>

            </div>
            {/* Amallar paneli — uzun formada ham doim ko'rinib turadi */}
            <div className="flex shrink-0 flex-col gap-3 border-t border-base-200 bg-base-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs text-base-content/50">
                <span className="font-semibold text-error">*</span> {t('erp.products.requiredFieldsHint')}
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" onClick={handleCloseNewProductModal} disabled={saving}>{t('common.cancel')}</Button>
                <Button type="submit" variant="primary" loading={saving} disabled={!isProductFormValid}>{t('common.save')}</Button>
              </div>
            </div>
          </form>
        </div>
      </ModalPortal>
    </div>
  );
}

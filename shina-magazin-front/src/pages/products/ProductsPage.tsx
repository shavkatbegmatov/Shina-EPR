import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../../utils/apiError';
import { Plus, Package, X, Upload } from 'lucide-react';
import clsx from 'clsx';
import { productsApi, brandsApi, categoriesApi } from '../../api/products.api';
import { formatCurrency, SEASONS } from '../../config/constants';
import { enumLabel } from '@/shared/enumLabel';
import { Select } from '../../components/ui/Select';
import { SearchInput } from '../../components/ui/SearchInput';
import { DataTable } from '../../components/ui/DataTable';
import { ExportButtons } from '../../components/common/ExportButtons';
import { ProductImportModal } from './ProductImportModal';
import { ProductFormModal } from './ProductFormModal';
import { ProductDetailModal } from './ProductDetailModal';
import { buildProductColumns } from './productColumns';
import { flattenCategoryTree, getEffectiveTemplate, indentLabel } from '../../utils/categoryTree';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useHighlight } from '../../hooks/useHighlight';
import { useInvalidateOnNotification } from '../../hooks/useInvalidateOnNotification';
import { queryKeys } from '../../lib/queryKeys';
import type { Product, Season } from '../../types';
import { Button } from '@/ui';

export function ProductsPage() {
  const { t } = useTranslation();
  const [showImport, setShowImport] = useState(false);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState<number | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('');
  const [seasonFilter, setSeasonFilter] = useState<Season | ''>('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  /**
   * Forma oynasi holati.
   *
   * <p>Formaning O'ZI `ProductFormModal` ichida — bu yerda faqat "oyna
   * ochiqmi va qaysi mahsulot" turadi. Ilgari 8 ta holat sahifada edi va
   * yopishda ularning har biri qo'lda tozalanardi.
   */
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const queryClient = useQueryClient();
  const { highlightId, clearHighlight } = useHighlight();

  // Brendlar va kategoriya daraxti — KATALOG sahifalari bilan bir xil
  // kalitda: bo'limlar orasida yurganda qaytadan so'ralmaydi va brend
  // tahrirlangach bu yerda ham o'z-o'zidan yangilanadi.
  const brandsQuery = useQuery({
    queryKey: queryKeys.brands.list(),
    queryFn: () => brandsApi.getAll(),
  });
  const categoryTreeQuery = useQuery({
    queryKey: queryKeys.categories.tree(),
    queryFn: () => categoriesApi.getTree(),
  });

  const brands = useMemo(() => brandsQuery.data ?? [], [brandsQuery.data]);
  const categoryTree = useMemo(() => categoryTreeQuery.data ?? [], [categoryTreeQuery.data]);

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

  // Shinaga tegishli bo'lmagan kategoriya tanlanganda mavsum filtri eskiradi
  useEffect(() => {
    if (!isTireContext && seasonFilter) {
      setSeasonFilter('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTireContext]);

  // Daraxt bo'yicha indentli variantlar (filtr va forma selectlari uchun)
  const categoryOptions = useMemo(
    () =>
      flattenCategoryTree(categoryTree).map((c) => ({
        value: c.id,
        label: indentLabel(c.name, c.depth),
      })),
    [categoryTree]
  );

  // Har bosilgan harfda sahifalangan so'rov yubormaslik uchun kechiktiriladi.
  // Mahsulot so'rovlari ataylab keshlanmaydi (zaxira eskirmasligi kerak),
  // shuning uchun ularning hech biri arzon emas.
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const listParams = {
    page,
    size: pageSize,
    search: debouncedSearch || undefined,
    brandId: brandFilter || undefined,
    categoryId: categoryFilter || undefined,
    season: seasonFilter || undefined,
  };

  const productsQuery = useQuery({
    queryKey: queryKeys.products.list(listParams),
    queryFn: () =>
      productsApi.getAll({ ...listParams, sort: ['createdAt,desc', 'id,desc'] }),
    placeholderData: keepPreviousData,
  });

  const products = productsQuery.data?.content ?? [];
  const totalPages = productsQuery.data?.totalPages ?? 0;
  const totalElements = productsQuery.data?.totalElements ?? 0;
  const loadError = productsQuery.isError ? getApiErrorMessage(productsQuery.error) : null;
  const initialLoading = productsQuery.isPending;
  // Kechiktirish davomida jadval hali ESKI matnga tegishli — bu holat
  // ko'rsatilmasa ro'yxat "tayyor" ko'rinardi.
  const refreshing =
    search.trim() !== debouncedSearch || (productsQuery.isFetching && !productsQuery.isPending);

  useInvalidateOnNotification([queryKeys.products.all]);

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
    setEditingProduct(null);
    setShowNewProductModal(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowNewProductModal(true);
  };

  // To'liq mahsulotni (atribut qiymatlari bilan) oynaning O'ZI oladi —
  // bu yerda faqat qaysi qator tanlangani saqlanadi.
  const handleShowDetails = (product: Product) => {
    setSelectedProduct(product);
  };

  const columns = useMemo(
    () => buildProductColumns(t, isTireContext, {
      onShowDetails: handleShowDetails,
      onEdit: handleEditProduct,
    }),
    // Handlerlar bog'liqlikda YO'Q: ular faqat `setState` chaqiradi (u
    // barqaror), lekin har renderda yangi funksiya bo'ladi — ro'yxatga
    // qo'shsak memo hech qachon ishlamasdi.
    [t, isTireContext]
  );

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
            <Button variant="ghost" onClick={() => setShowImport(true)}>
              <Upload className="mr-2 h-4 w-4" />
              {t('erp.import.action')}
            </Button>
          </PermissionGate>
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
          error={loadError}
          onRetry={() => void productsQuery.refetch()}
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

      {/* SHARTLI render — yopilganda so'rov ham bekor bo'ladi */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* SHARTLI render — yopilganda komponent unmount bo'lib, forma
          holati tuzilishi bilan tozalanadi. */}
      {showNewProductModal && (
        <ProductFormModal
          product={editingProduct}
          brands={brands}
          categoryTree={categoryTree}
          onClose={() => setShowNewProductModal(false)}
        />
      )}

      <ProductImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={() => void queryClient.invalidateQueries({ queryKey: queryKeys.products.all })}
      />
    </div>
  );
}

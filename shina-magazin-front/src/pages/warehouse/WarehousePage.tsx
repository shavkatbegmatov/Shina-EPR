import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  TrendingUp,
  AlertTriangle,
  Plus,
  Minus,
  Settings,
  X,
  Search,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  Truck,
  ExternalLink,
} from 'lucide-react';
import clsx from 'clsx';
import { warehouseApi } from '../../api/warehouse.api';
import { productsApi } from '../../api/products.api';
import { suppliersApi } from '../../api/suppliers.api';
import { NumberInput } from '../../components/ui/NumberInput';
import { Select } from '../../components/ui/Select';
import { DataTable, Column } from '../../components/ui/DataTable';
import { ModalPortal } from '../../components/common/Modal';
import { useNotificationsStore } from '../../store/notificationsStore';
import {
  formatNumber,
  formatCurrency,
  formatDateTime,
  MOVEMENT_TYPES,
  REFERENCE_TYPES,
} from '../../config/constants';
import type {
  MovementType,
  Product,
  StockMovement,
  WarehouseStats,
  Supplier,
} from '../../types';

export function WarehousePage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<WarehouseStats | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadingMovements, setInitialLoadingMovements] = useState(true);
  const [refreshingMovements, setRefreshingMovements] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Filters
  const [movementTypeFilter, setMovementTypeFilter] = useState<MovementType | ''>('');
  const [referenceTypeFilter, setReferenceTypeFilter] = useState('');

  // Adjustment modal
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<MovementType>('IN');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Product search for adjustment
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Supplier for IN movements
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [unitPrice, setUnitPrice] = useState<number>(0);

  const { notifications } = useNotificationsStore();

  const getMovementIcon = (type: MovementType) => {
    switch (type) {
      case 'IN':
        return <ArrowDownCircle className="h-4 w-4 text-success" />;
      case 'OUT':
        return <ArrowUpCircle className="h-4 w-4 text-error" />;
      case 'ADJUSTMENT':
        return <RefreshCw className="h-4 w-4 text-info" />;
    }
  };

  // Table columns
  const columns: Column<StockMovement>[] = useMemo(() => [
    {
      key: 'createdAt',
      header: 'Sana',
      getValue: (m) => new Date(m.createdAt).getTime(),
      render: (movement) => (
        <span className="text-sm text-base-content/70">
          {formatDateTime(movement.createdAt)}
        </span>
      ),
    },
    {
      key: 'productName',
      header: 'Mahsulot',
      render: (movement) => (
        <div>
          <div className="font-medium">{movement.productName}</div>
          <div className="text-xs text-base-content/60">{movement.productSku}</div>
        </div>
      ),
    },
    {
      key: 'movementType',
      header: 'Turi',
      render: (movement) => (
        <div className="flex items-center gap-2">
          {getMovementIcon(movement.movementType)}
          <span className="badge badge-outline badge-sm">
            {MOVEMENT_TYPES[movement.movementType]?.label}
          </span>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Miqdor',
      getValue: (m) => m.quantity,
      render: (movement) => (
        <span
          className={clsx(
            'font-semibold',
            movement.quantity > 0 && 'text-success',
            movement.quantity < 0 && 'text-error'
          )}
        >
          {movement.quantity > 0 ? '+' : ''}{movement.quantity}
        </span>
      ),
    },
    {
      key: 'newStock',
      header: 'Zaxira',
      getValue: (m) => m.newStock,
      render: (movement) => (
        <span>
          <span className="text-base-content/60">{movement.previousStock}</span>
          <span className="mx-1">→</span>
          <span className="font-medium">{movement.newStock}</span>
        </span>
      ),
    },
    {
      key: 'referenceType',
      header: 'Manba',
      render: (movement) => (
        <span className="badge badge-ghost badge-sm">
          {REFERENCE_TYPES[movement.referenceType as keyof typeof REFERENCE_TYPES]?.label || movement.referenceType}
        </span>
      ),
    },
  ], []);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  const loadStats = useCallback(async () => {
    try {
      const data = await warehouseApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  const loadMovements = useCallback(async (isInitial = false) => {
    if (!isInitial) {
      setRefreshingMovements(true);
    }
    try {
      const data = await warehouseApi.getMovements({
        page,
        size: pageSize,
        movementType: movementTypeFilter || undefined,
        referenceType: referenceTypeFilter || undefined,
      });
      setMovements(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (error) {
      console.error('Failed to load movements:', error);
    } finally {
      setInitialLoadingMovements(false);
      setRefreshingMovements(false);
    }
  }, [page, pageSize, movementTypeFilter, referenceTypeFilter]);

  const loadLowStockProducts = useCallback(async () => {
    try {
      const data = await warehouseApi.getLowStockProducts();
      setLowStockProducts(data);
    } catch (error) {
      console.error('Failed to load low stock products:', error);
    }
  }, []);

  const loadAllSuppliers = useCallback(async () => {
    try {
      const data = await suppliersApi.getActive();
      setAllSuppliers(data);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadStats(), loadLowStockProducts(), loadAllSuppliers()]);
    setLoading(false);
  }, [loadStats, loadLowStockProducts, loadAllSuppliers]);

  useEffect(() => {
    loadInitialData();
    loadMovements(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when filters change
  useEffect(() => {
    loadMovements();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, movementTypeFilter, referenceTypeFilter]);

  // WebSocket orqali yangi notification kelganda ombor ma'lumotlarini yangilash
  useEffect(() => {
    if (notifications.length > 0) {
      loadStats();
      loadMovements();
      loadLowStockProducts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.length]);

  const handleSearchProducts = async (query: string) => {
    setProductSearch(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const data = await productsApi.getAll({ search: query, size: 10 });
      setSearchResults(data.content);
    } catch (error) {
      console.error('Failed to search products:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductSearch('');
    setSearchResults([]);
  };

  const handleOpenAdjustmentModal = (type: MovementType) => {
    setAdjustmentType(type);
    setSelectedProduct(null);
    setAdjustmentQuantity('');
    setAdjustmentNotes('');
    setProductSearch('');
    setSearchResults([]);
    setSelectedSupplier(null);
    setUnitPrice(0);
    setShowAdjustmentModal(true);
  };

  const handleCloseAdjustmentModal = () => {
    setShowAdjustmentModal(false);
    setSelectedProduct(null);
    setAdjustmentQuantity('');
    setAdjustmentNotes('');
    setSelectedSupplier(null);
    setUnitPrice(0);
  };

  const handleSubmitAdjustment = async () => {
    if (!selectedProduct) return;

    const quantity = parseInt(adjustmentQuantity);
    if (isNaN(quantity) || quantity <= 0) return;

    setSubmitting(true);
    try {
      await warehouseApi.createAdjustment({
        productId: selectedProduct.id,
        movementType: adjustmentType,
        quantity,
        notes: adjustmentNotes || undefined,
      });

      handleCloseAdjustmentModal();
      loadStats();
      loadMovements();
      loadLowStockProducts();
    } catch (error) {
      console.error('Failed to create adjustment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title">Ombor</h1>
          <p className="section-subtitle">Zaxira nazorati va kirim-chiqim</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="btn btn-success"
            onClick={() => handleOpenAdjustmentModal('IN')}
          >
            <Plus className="h-5 w-5" />
            Kirim
          </button>
          <button
            className="btn btn-error"
            onClick={() => handleOpenAdjustmentModal('OUT')}
          >
            <Minus className="h-5 w-5" />
            Chiqim
          </button>
          <button
            className="btn btn-info btn-outline"
            onClick={() => handleOpenAdjustmentModal('ADJUSTMENT')}
          >
            <Settings className="h-5 w-5" />
            Tuzatish
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="surface-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-base-content/60">Jami mahsulotlar</p>
                <p className="text-xl font-bold">{formatNumber(stats.totalProducts)}</p>
              </div>
            </div>
          </div>

          <div className="surface-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-success/10 p-2">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-base-content/60">Jami zaxira</p>
                <p className="text-xl font-bold">{formatNumber(stats.totalStock)}</p>
              </div>
            </div>
          </div>

          <div className="surface-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-info/10 p-2">
                <ArrowDownCircle className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-xs text-base-content/60">Bugungi kirim</p>
                <p className="text-xl font-bold text-success">+{formatNumber(stats.todayIncoming)}</p>
              </div>
            </div>
          </div>

          <div className="surface-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-error/10 p-2">
                <ArrowUpCircle className="h-5 w-5 text-error" />
              </div>
              <div>
                <p className="text-xs text-base-content/60">Bugungi chiqim</p>
                <p className="text-xl font-bold text-error">-{formatNumber(stats.todayOutgoing)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Movements Table */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="surface-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/50">
                Kirim-chiqim tarixi
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={movementTypeFilter || undefined}
                  onChange={(val) => {
                    setMovementTypeFilter((val as MovementType | '') || '');
                    setPage(0);
                  }}
                  options={[
                    { value: '', label: 'Barcha turlar' },
                    ...Object.entries(MOVEMENT_TYPES).map(([key, { label }]) => ({
                      value: key,
                      label,
                    })),
                  ]}
                  placeholder="Barcha turlar"
                />
                <Select
                  value={referenceTypeFilter || undefined}
                  onChange={(val) => {
                    setReferenceTypeFilter((val as string) || '');
                    setPage(0);
                  }}
                  options={[
                    { value: '', label: 'Barcha manbalar' },
                    ...Object.entries(REFERENCE_TYPES).map(([key, { label }]) => ({
                      value: key,
                      label,
                    })),
                  ]}
                  placeholder="Barcha manbalar"
                />
              </div>
            </div>
          </div>

          <div className="relative">
            {refreshingMovements && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-base-100/60 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                  <span className="text-sm font-medium text-base-content/70">Yangilanmoqda...</span>
                </div>
              </div>
            )}
            <DataTable
              data={movements}
              columns={columns}
              keyExtractor={(movement) => movement.id}
              loading={initialLoadingMovements}
              emptyIcon={<Package className="h-12 w-12" />}
            emptyTitle="Harakatlar topilmadi"
            emptyDescription="Kirim yoki chiqim qo'shing"
            currentPage={page}
            totalPages={totalPages}
            totalElements={totalElements}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
            renderMobileCard={(movement) => (
              <div className="surface-panel flex flex-col gap-2 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{movement.productName}</p>
                    <p className="text-xs text-base-content/60">{movement.productSku}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {getMovementIcon(movement.movementType)}
                    <span
                      className={clsx(
                        'font-bold',
                        movement.quantity > 0 && 'text-success',
                        movement.quantity < 0 && 'text-error'
                      )}
                    >
                      {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-base-content/60">
                    {movement.previousStock} → {movement.newStock}
                  </span>
                  <span className="text-xs text-base-content/50">
                    {formatDateTime(movement.createdAt)}
                  </span>
                </div>
              </div>
            )}
          />
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="lg:col-span-1">
          <div className="surface-card p-4 space-y-4 sticky top-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/50">
                Kam zaxira
              </h3>
              {stats && stats.lowStockCount > 0 && (
                <span className="badge badge-error badge-sm">
                  {stats.lowStockCount}
                </span>
              )}
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="text-center py-8 text-base-content/50">
                <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Kam zaxiradagi mahsulotlar yo'q</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {lowStockProducts.map((product) => (
                  <div
                    key={product.id}
                    className="surface-soft rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <p className="text-xs text-base-content/60">{product.sku}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-bold text-error">{product.quantity}</p>
                        <p className="text-xs text-base-content/50">
                          min: {product.minStockLevel}
                        </p>
                      </div>
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Adjustment Modal */}
      <ModalPortal isOpen={showAdjustmentModal} onClose={handleCloseAdjustmentModal}>
        <div className="w-full max-w-lg bg-base-100 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">
                  {adjustmentType === 'IN' && 'Kirim qo\'shish'}
                  {adjustmentType === 'OUT' && 'Chiqim qo\'shish'}
                  {adjustmentType === 'ADJUSTMENT' && 'Zaxirani tuzatish'}
                </h3>
                <p className="text-sm text-base-content/60">
                  {adjustmentType === 'IN' && 'Omborga yangi mahsulot kirimi'}
                  {adjustmentType === 'OUT' && 'Ombordan mahsulot chiqimi'}
                  {adjustmentType === 'ADJUSTMENT' && "Zaxira miqdorini to'g'rilash"}
                </p>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleCloseAdjustmentModal}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {/* Product Search */}
              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  Mahsulot *
                </span>
                {selectedProduct ? (
                  <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                    <div>
                      <p className="font-medium">{selectedProduct.name}</p>
                      <p className="text-sm text-base-content/60">
                        SKU: {selectedProduct.sku} | Zaxira: {selectedProduct.quantity}
                      </p>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm btn-circle"
                      onClick={() => setSelectedProduct(null)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="input-group">
                      <span className="bg-base-200">
                        <Search className="h-5 w-5" />
                      </span>
                      <input
                        type="text"
                        className="input input-bordered w-full"
                        placeholder="Mahsulot qidirish..."
                        value={productSearch}
                        onChange={(e) => handleSearchProducts(e.target.value)}
                      />
                    </div>
                    {searchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {searchResults.map((product) => (
                          <button
                            key={product.id}
                            className="w-full text-left px-4 py-2 hover:bg-base-200 transition"
                            onClick={() => handleSelectProduct(product)}
                          >
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-base-content/60">
                              {product.sku} | Zaxira: {product.quantity}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchLoading && (
                      <div className="absolute z-10 w-full mt-1 bg-base-100 border border-base-300 rounded-lg p-4 text-center">
                        <span className="loading loading-spinner loading-sm" />
                      </div>
                    )}
                  </div>
                )}
              </label>

              <div className="form-control">
                <NumberInput
                  label={adjustmentType === 'ADJUSTMENT' ? 'Yangi zaxira miqdori *' : 'Miqdor *'}
                  value={adjustmentQuantity}
                  onChange={(val) => setAdjustmentQuantity(String(val))}
                  min={1}
                  max={adjustmentType === 'OUT' && selectedProduct ? selectedProduct.quantity : undefined}
                  placeholder="0"
                />
                {adjustmentType === 'ADJUSTMENT' && selectedProduct && (
                  <span className="label-text-alt mt-1 text-base-content/50">
                    Hozirgi zaxira: {selectedProduct.quantity}
                  </span>
                )}
                {adjustmentType === 'OUT' && selectedProduct && (
                  <span className="label-text-alt mt-1 text-base-content/50">
                    Mavjud zaxira: {selectedProduct.quantity}
                  </span>
                )}
              </div>

              {/* Supplier section - only for IN movements */}
              {adjustmentType === 'IN' && (
                <div className="surface-soft rounded-xl p-4 space-y-4">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Ta'minotchi (ixtiyoriy)
                  </h4>

                  <label className="form-control">
                    <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                      Ta'minotchi
                    </span>
                    <div className="flex gap-2">
                      <Select
                        value={selectedSupplier?.id || undefined}
                        onChange={(val) => {
                          const supplier = allSuppliers.find(s => s.id === Number(val));
                          setSelectedSupplier(supplier || null);
                        }}
                        options={[
                          { value: '', label: "Ta'minotchisiz" },
                          ...allSuppliers.map(supplier => ({
                            value: supplier.id,
                            label: supplier.name,
                          })),
                        ]}
                        placeholder="Ta'minotchisiz"
                        className="flex-1"
                      />
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => navigate('/suppliers')}
                        title="Yangi ta'minotchi qo'shish"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </div>
                  </label>

                  {selectedSupplier && (
                    <label className="form-control">
                      <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                        Birlik narxi
                      </span>
                      <input
                        type="number"
                        min={0}
                        className="input input-bordered w-full"
                        value={unitPrice || ''}
                        onChange={(e) => setUnitPrice(Number(e.target.value) || 0)}
                        placeholder="0"
                      />
                      {unitPrice > 0 && adjustmentQuantity && (
                        <span className="label-text-alt mt-1 text-base-content/70">
                          Jami: {formatCurrency(unitPrice * parseInt(adjustmentQuantity || '0'))}
                        </span>
                      )}
                    </label>
                  )}
                </div>
              )}

              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  Izoh
                </span>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={2}
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  placeholder="Sabab yoki qo'shimcha ma'lumot..."
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="btn btn-ghost"
                onClick={handleCloseAdjustmentModal}
                disabled={submitting}
              >
                Bekor qilish
              </button>
              <button
                className={clsx(
                  'btn',
                  adjustmentType === 'IN' && 'btn-success',
                  adjustmentType === 'OUT' && 'btn-error',
                  adjustmentType === 'ADJUSTMENT' && 'btn-info'
                )}
                onClick={handleSubmitAdjustment}
                disabled={
                  submitting ||
                  !selectedProduct ||
                  !adjustmentQuantity ||
                  parseInt(adjustmentQuantity) <= 0
                }
              >
                {submitting && <span className="loading loading-spinner loading-sm" />}
                {adjustmentType === 'IN' && 'Kirim qo\'shish'}
                {adjustmentType === 'OUT' && 'Chiqim qo\'shish'}
                {adjustmentType === 'ADJUSTMENT' && 'Tuzatish'}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}

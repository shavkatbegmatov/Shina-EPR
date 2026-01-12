import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  ShoppingCart,
  Calendar,
  TrendingUp,
  Wallet,
  Package,
  Truck,
  X,
  Trash2,
  RefreshCw,
  RotateCcw,
  FileText,
  Hash,
} from 'lucide-react';
import clsx from 'clsx';
import { purchasesApi, type PurchaseFilters } from '../../api/purchases.api';
import { suppliersApi } from '../../api/suppliers.api';
import { productsApi } from '../../api/products.api';
import { formatCurrency, formatDate } from '../../config/constants';
import { DataTable, Column } from '../../components/ui/DataTable';
import { ModalPortal } from '../../components/common/Modal';
// TODO: Sana filtri backend tomonidan qo'shilgach aktivlashtirish
// import { DateRangePicker, type DateRangePreset, type DateRange } from '../../components/common/DateRangePicker';
import { useNotificationsStore } from '../../store/notificationsStore';
import type {
  Supplier,
  PurchaseOrder,
  PurchaseStats,
  PurchaseRequest,
  PurchaseItemRequest,
  Product,
  PurchaseStatus,
  PaymentStatus,
} from '../../types';

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
}

export function PurchasesPage() {
  const navigate = useNavigate();
  const { notifications } = useNotificationsStore();

  // Purchases state
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [purchaseStats, setPurchaseStats] = useState<PurchaseStats | null>(null);

  // Filter state
  // TODO: Sana filtri backend tomonidan qo'shilgach aktivlashtirish
  // const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('month');
  // const [customRange, setCustomRange] = useState<DateRange>({ start: '', end: '' });
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<PurchaseStatus | ''>('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<PaymentStatus | ''>('');

  // Suppliers for filter dropdown
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Purchase modal state
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseSaving, setPurchaseSaving] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [purchaseNotes, setPurchaseNotes] = useState('');

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);

  // Calculate cart totals
  const cartTotal = useMemo(() =>
    cartItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
    [cartItems]
  );
  const cartTotalQuantity = useMemo(() =>
    cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );
  const debtAmount = useMemo(() => Math.max(0, cartTotal - paidAmount), [cartTotal, paidAmount]);

  // TODO: Sana filtri backend tomonidan qo'shilgach aktivlashtirish
  // const getDateRangeValues = useCallback((preset: DateRangePreset): { start: string; end: string } => {
  //   const today = new Date();
  //   const end = today.toISOString().split('T')[0];
  //   let start: Date;
  //
  //   switch (preset) {
  //     case 'today':
  //       start = today;
  //       break;
  //     case 'week':
  //       start = new Date(today);
  //       start.setDate(start.getDate() - 7);
  //       break;
  //     case 'month':
  //       start = new Date(today);
  //       start.setMonth(start.getMonth() - 1);
  //       break;
  //     case 'quarter':
  //       start = new Date(today);
  //       start.setMonth(start.getMonth() - 3);
  //       break;
  //     case 'year':
  //       start = new Date(today);
  //       start.setFullYear(start.getFullYear() - 1);
  //       break;
  //     case 'custom':
  //       return { start: customRange.start, end: customRange.end };
  //     default:
  //       start = new Date(today);
  //       start.setMonth(start.getMonth() - 1);
  //   }
  //
  //   return { start: start.toISOString().split('T')[0], end };
  // }, [customRange.start, customRange.end]);

  // Load purchases
  // TODO: Backend hozircha startDate/endDate ni qo'llab-quvvatlamaydi
  // Sana filtri backend tomonidan qo'shilgach aktivlashtirish kerak
  const loadPurchases = useCallback(async (isInitial = false) => {
    if (!isInitial) {
      setRefreshing(true);
    }
    try {
      const filters: PurchaseFilters = {
        page,
        size: pageSize,
        supplierId: selectedSupplierId,
        status: selectedStatus || undefined,
        // Sana filtrlarini hozircha o'chirib qo'yamiz chunki backend qo'llab-quvvatlamaydi
        // startDate: start || undefined,
        // endDate: end || undefined,
      };

      const data = await purchasesApi.getAll(filters);
      setPurchases(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (error) {
      console.error('Failed to load purchases:', error);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [page, pageSize, selectedSupplierId, selectedStatus]);

  // Load purchase stats
  const loadPurchaseStats = useCallback(async () => {
    try {
      const stats = await purchasesApi.getStats();
      setPurchaseStats(stats);
    } catch (error) {
      console.error('Failed to load purchase stats:', error);
    }
  }, []);

  // Load suppliers for filter dropdown
  const loadSuppliers = useCallback(async () => {
    try {
      const data = await suppliersApi.getActive();
      setSuppliers(data);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    }
  }, []);

  // Search products
  const searchProducts = useCallback(async (query: string) => {
    if (!query.trim()) {
      setProductResults([]);
      return;
    }
    setProductSearchLoading(true);
    try {
      const data = await productsApi.getAll({ search: query, size: 10 });
      setProductResults(data.content);
    } catch (error) {
      console.error('Failed to search products:', error);
    } finally {
      setProductSearchLoading(false);
    }
  }, []);

  // Debounced product search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchProducts(productSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch, searchProducts]);

  // Initial load
  useEffect(() => {
    loadPurchases(true);
    loadPurchaseStats();
    loadSuppliers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when filters change
  useEffect(() => {
    loadPurchases();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, selectedSupplierId, selectedStatus]);

  // Real-time updates
  useEffect(() => {
    if (notifications.length > 0) {
      loadPurchases();
      loadPurchaseStats();
    }
  }, [notifications.length, loadPurchases, loadPurchaseStats]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  // TODO: Sana filtri backend tomonidan qo'shilgach aktivlashtirish
  // const handleDateRangeChange = (preset: DateRangePreset, range?: DateRange) => {
  //   setDateRangePreset(preset);
  //   if (range) {
  //     setCustomRange(range);
  //   }
  //   setPage(0);
  // };

  const handleClearFilters = () => {
    setSelectedSupplierId(undefined);
    setSelectedStatus('');
    setSelectedPaymentStatus('');
    // setDateRangePreset('month');
    // setCustomRange({ start: '', end: '' });
    setPage(0);
  };

  const hasActiveFilters = useMemo(() =>
    selectedSupplierId !== undefined ||
    selectedStatus !== '' ||
    selectedPaymentStatus !== '',
    [selectedSupplierId, selectedStatus, selectedPaymentStatus]
  );

  // Purchase modal handlers
  const handleOpenPurchaseModal = () => {
    setSelectedSupplier(null);
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setCartItems([]);
    setPaidAmount(0);
    setPurchaseNotes('');
    setProductSearch('');
    setProductResults([]);
    setShowPurchaseModal(true);
  };

  const handleClosePurchaseModal = () => {
    setShowPurchaseModal(false);
    setSelectedSupplier(null);
    setCartItems([]);
    setPaidAmount(0);
    setPurchaseNotes('');
    setProductSearch('');
    setProductResults([]);
  };

  const handleAddToCart = (product: Product) => {
    const existing = cartItems.find(item => item.product.id === product.id);
    if (existing) {
      setCartItems(prev => prev.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCartItems(prev => [...prev, {
        product,
        quantity: 1,
        unitPrice: product.purchasePrice || Math.round(product.sellingPrice * 0.7),
      }]);
    }
    setProductSearch('');
    setProductResults([]);
  };

  const handleUpdateCartItem = (productId: number, field: 'quantity' | 'unitPrice', value: number) => {
    setCartItems(prev => prev.map(item =>
      item.product.id === productId
        ? { ...item, [field]: value }
        : item
    ));
  };

  const handleRemoveFromCart = (productId: number) => {
    setCartItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleSavePurchase = async () => {
    if (!selectedSupplier || cartItems.length === 0) return;

    setPurchaseSaving(true);
    try {
      const items: PurchaseItemRequest[] = cartItems.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }));

      const request: PurchaseRequest = {
        supplierId: selectedSupplier.id,
        orderDate: purchaseDate,
        paidAmount,
        notes: purchaseNotes || undefined,
        items,
      };

      await purchasesApi.create(request);
      handleClosePurchaseModal();
      loadPurchases();
      loadPurchaseStats();
    } catch (error) {
      console.error('Failed to save purchase:', error);
    } finally {
      setPurchaseSaving(false);
    }
  };

  // Navigate to detail page
  const handleRowClick = (purchase: PurchaseOrder) => {
    navigate(`/purchases/${purchase.id}`);
  };

  // Table columns
  const columns: Column<PurchaseOrder>[] = useMemo(() => [
    {
      key: 'orderNumber',
      header: 'Raqam',
      render: (purchase) => (
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-base-content/50" />
          <span className="font-mono font-medium">{purchase.orderNumber}</span>
        </div>
      ),
    },
    {
      key: 'orderDate',
      header: 'Sana',
      render: (purchase) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-base-content/50" />
          <span>{formatDate(purchase.orderDate)}</span>
        </div>
      ),
    },
    {
      key: 'supplierName',
      header: "Ta'minotchi",
      render: (purchase) => (
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-base-content/50" />
          <span className="font-medium">{purchase.supplierName}</span>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Mahsulotlar',
      render: (purchase) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-base-content/50" />
          <span>{purchase.itemCount} xil, {purchase.totalQuantity} dona</span>
        </div>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Summa',
      getValue: (purchase) => purchase.totalAmount,
      render: (purchase) => (
        <span className="font-semibold">{formatCurrency(purchase.totalAmount)}</span>
      ),
    },
    {
      key: 'paidAmount',
      header: "To'langan",
      getValue: (purchase) => purchase.paidAmount,
      render: (purchase) => (
        <span className="text-success">{formatCurrency(purchase.paidAmount)}</span>
      ),
    },
    {
      key: 'debtAmount',
      header: 'Qarz',
      getValue: (purchase) => purchase.debtAmount,
      render: (purchase) => (
        <span className={clsx(
          'font-medium',
          purchase.debtAmount > 0 ? 'text-error' : 'text-success'
        )}>
          {purchase.debtAmount > 0 ? formatCurrency(purchase.debtAmount) : "To'langan"}
        </span>
      ),
    },
    {
      key: 'paymentStatus',
      header: "To'lov",
      render: (purchase) => (
        <span className={clsx(
          'badge badge-sm',
          purchase.paymentStatus === 'PAID' && 'badge-success',
          purchase.paymentStatus === 'PARTIAL' && 'badge-warning',
          purchase.paymentStatus === 'UNPAID' && 'badge-error'
        )}>
          {purchase.paymentStatus === 'PAID' && "To'langan"}
          {purchase.paymentStatus === 'PARTIAL' && 'Qisman'}
          {purchase.paymentStatus === 'UNPAID' && "To'lanmagan"}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (purchase) => (
        <span className={clsx(
          'badge badge-sm',
          purchase.status === 'RECEIVED' && 'badge-success',
          purchase.status === 'DRAFT' && 'badge-warning',
          purchase.status === 'CANCELLED' && 'badge-error'
        )}>
          {purchase.status === 'RECEIVED' && 'Qabul'}
          {purchase.status === 'DRAFT' && 'Qoralama'}
          {purchase.status === 'CANCELLED' && 'Bekor'}
        </span>
      ),
    },
  ], []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title">Xaridlar</h1>
          <p className="section-subtitle">Ta'minotchilardan mahsulot xaridlari</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="pill">{totalElements} ta xarid</span>
          <button className="btn btn-primary" onClick={handleOpenPurchaseModal}>
            <Plus className="h-5 w-5" />
            Yangi xarid
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Jami xaridlar</p>
              <p className="text-xl font-bold">{purchaseStats?.totalPurchases || 0}</p>
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-info/10 p-2.5">
              <Calendar className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Bugungi</p>
              <p className="text-xl font-bold">{purchaseStats?.todayPurchases || 0}</p>
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-secondary/10 p-2.5">
              <FileText className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Oylik</p>
              <p className="text-xl font-bold">{purchaseStats?.monthPurchases || 0}</p>
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2.5">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Jami summa</p>
              <p className="text-lg font-bold">{formatCurrency(purchaseStats?.totalAmount || 0)}</p>
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
              <p className="text-lg font-bold text-error">{formatCurrency(purchaseStats?.totalDebt || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Returns Info */}
      {purchaseStats && purchaseStats.pendingReturns > 0 && (
        <div className="alert alert-warning">
          <RotateCcw className="h-5 w-5" />
          <span>
            <strong>{purchaseStats.pendingReturns}</strong> ta kutilayotgan qaytarish mavjud
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="surface-card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            {/* Date Range - Backend qo'llab-quvvatlaguncha yashirilgan */}
            {/* <div>
              <span className="block mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                Davr
              </span>
              <DateRangePicker
                value={dateRangePreset}
                customRange={customRange}
                onChange={handleDateRangeChange}
              />
            </div> */}

            {/* Supplier Filter */}
            <label className="form-control">
              <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                Ta'minotchi
              </span>
              <select
                className="select select-bordered select-sm w-44"
                value={selectedSupplierId || ''}
                onChange={(e) => {
                  setSelectedSupplierId(e.target.value ? Number(e.target.value) : undefined);
                  setPage(0);
                }}
              >
                <option value="">Barchasi</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>

            {/* Status Filter */}
            <label className="form-control">
              <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                Status
              </span>
              <select
                className="select select-bordered select-sm w-36"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value as PurchaseStatus | '');
                  setPage(0);
                }}
              >
                <option value="">Barchasi</option>
                <option value="RECEIVED">Qabul qilingan</option>
                <option value="DRAFT">Qoralama</option>
                <option value="CANCELLED">Bekor qilingan</option>
              </select>
            </label>

            {/* Payment Status Filter */}
            <label className="form-control">
              <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                To'lov
              </span>
              <select
                className="select select-bordered select-sm w-36"
                value={selectedPaymentStatus}
                onChange={(e) => {
                  setSelectedPaymentStatus(e.target.value as PaymentStatus | '');
                  setPage(0);
                }}
              >
                <option value="">Barchasi</option>
                <option value="PAID">To'langan</option>
                <option value="PARTIAL">Qisman</option>
                <option value="UNPAID">To'lanmagan</option>
              </select>
            </label>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleClearFilters}
              >
                <X className="h-4 w-4" />
                Tozalash
              </button>
            )}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => loadPurchases()}
            >
              <RefreshCw className="h-4 w-4" />
              Yangilash
            </button>
          </div>
        </div>
      </div>

      {/* Purchases Table */}
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
          data={purchases}
          columns={columns}
          keyExtractor={(purchase) => purchase.id}
          loading={initialLoading}
          emptyIcon={<ShoppingCart className="h-12 w-12" />}
        emptyTitle="Xaridlar topilmadi"
        emptyDescription="Yangi xarid qo'shish uchun tugmani bosing"
        onRowClick={handleRowClick}
        rowClassName={(purchase) => clsx(
          'cursor-pointer hover:bg-base-200/50',
          purchase.debtAmount > 0 && 'bg-error/5'
        )}
        currentPage={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        renderMobileCard={(purchase) => (
          <div
            className="surface-panel flex flex-col gap-3 rounded-xl p-4 cursor-pointer"
            onClick={() => handleRowClick(purchase)}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono font-semibold">{purchase.orderNumber}</p>
                <p className="text-sm font-medium text-base-content/80">{purchase.supplierName}</p>
                <p className="text-xs text-base-content/60">
                  {formatDate(purchase.orderDate)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={clsx(
                  'badge badge-sm',
                  purchase.status === 'RECEIVED' && 'badge-success',
                  purchase.status === 'DRAFT' && 'badge-warning',
                  purchase.status === 'CANCELLED' && 'badge-error'
                )}>
                  {purchase.status === 'RECEIVED' && 'Qabul'}
                  {purchase.status === 'DRAFT' && 'Qoralama'}
                  {purchase.status === 'CANCELLED' && 'Bekor'}
                </span>
                <span className={clsx(
                  'badge badge-sm',
                  purchase.paymentStatus === 'PAID' && 'badge-success',
                  purchase.paymentStatus === 'PARTIAL' && 'badge-warning',
                  purchase.paymentStatus === 'UNPAID' && 'badge-error'
                )}>
                  {purchase.paymentStatus === 'PAID' && "To'langan"}
                  {purchase.paymentStatus === 'PARTIAL' && 'Qisman'}
                  {purchase.paymentStatus === 'UNPAID' && "To'lanmagan"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-base-content/70">
              <Package className="h-4 w-4" />
              {purchase.itemCount} xil, {purchase.totalQuantity} dona
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-base-200">
              <div>
                <p className="text-sm font-semibold">{formatCurrency(purchase.totalAmount)}</p>
                {purchase.debtAmount > 0 && (
                  <p className="text-xs text-error">Qarz: {formatCurrency(purchase.debtAmount)}</p>
                )}
              </div>
            </div>
          </div>
        )}
      />
      </div>

      {/* Purchase Modal */}
      <ModalPortal isOpen={showPurchaseModal} onClose={handleClosePurchaseModal}>
        <div className="w-full max-w-4xl bg-base-100 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">Yangi xarid</h3>
                <p className="text-sm text-base-content/60">
                  Ta'minotchidan mahsulot xarid qilish
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleClosePurchaseModal}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              {/* Ta'minotchi va sana */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="form-control">
                  <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                    Ta'minotchi *
                  </span>
                  <select
                    className="select select-bordered w-full"
                    value={selectedSupplier?.id || ''}
                    onChange={(e) => {
                      const supplier = suppliers.find(s => s.id === Number(e.target.value));
                      setSelectedSupplier(supplier || null);
                    }}
                  >
                    <option value="">Ta'minotchini tanlang</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-control">
                  <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                    Sana *
                  </span>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                  />
                </label>
              </div>

              {/* Mahsulotlar */}
              <div className="surface-soft rounded-xl p-4">
                <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Mahsulotlar
                </h4>

                {/* Product search */}
                <div className="relative mb-4">
                  <div className="input-group">
                    <span className="bg-base-200"><Search className="h-5 w-5" /></span>
                    <input
                      type="text"
                      placeholder="Mahsulot qidirish..."
                      className="input input-bordered w-full"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />
                  </div>
                  {/* Search results dropdown */}
                  {productResults.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {productResults.map(product => (
                        <button
                          key={product.id}
                          className="w-full p-3 text-left hover:bg-base-200 flex items-center justify-between"
                          onClick={() => handleAddToCart(product)}
                        >
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-base-content/60">
                              {product.sku} {product.sizeString && `| ${product.sizeString}`}
                            </p>
                          </div>
                          <span className="text-sm font-semibold">
                            {formatCurrency(product.purchasePrice || Math.round(product.sellingPrice * 0.7))}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {productSearchLoading && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-base-100 border border-base-300 rounded-lg p-4 text-center">
                      <span className="loading loading-spinner loading-sm" />
                    </div>
                  )}
                </div>

                {/* Cart items table */}
                {cartItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Mahsulot</th>
                          <th className="w-28">Miqdor</th>
                          <th className="w-36">Narx</th>
                          <th className="w-32 text-right">Summa</th>
                          <th className="w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cartItems.map(item => (
                          <tr key={item.product.id}>
                            <td>
                              <div>
                                <p className="font-medium">{item.product.name}</p>
                                <p className="text-xs text-base-content/60">{item.product.sku}</p>
                              </div>
                            </td>
                            <td>
                              <input
                                type="number"
                                min={1}
                                className="input input-bordered input-sm w-full"
                                value={item.quantity}
                                onChange={(e) => handleUpdateCartItem(item.product.id, 'quantity', Number(e.target.value) || 1)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min={0}
                                className="input input-bordered input-sm w-full"
                                value={item.unitPrice}
                                onChange={(e) => handleUpdateCartItem(item.product.id, 'unitPrice', Number(e.target.value) || 0)}
                              />
                            </td>
                            <td className="text-right font-semibold">
                              {formatCurrency(item.quantity * item.unitPrice)}
                            </td>
                            <td>
                              <button
                                className="btn btn-ghost btn-sm btn-square text-error"
                                onClick={() => handleRemoveFromCart(item.product.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-base-content/50">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Mahsulot qo'shilmagan</p>
                  </div>
                )}
              </div>

              {/* Summary */}
              {cartItems.length > 0 && (
                <div className="surface-soft rounded-xl p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-base-content/70">Jami mahsulotlar:</span>
                      <span className="font-medium">{cartTotalQuantity} dona</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Jami summa:</span>
                      <span>{formatCurrency(cartTotal)}</span>
                    </div>
                    <div className="divider my-2"></div>
                    <label className="form-control">
                      <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                        To'langan summa
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={cartTotal}
                        className="input input-bordered w-full"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                      />
                    </label>
                    <div className="flex justify-between text-lg">
                      <span className="text-base-content/70">Qarz:</span>
                      <span className={clsx('font-semibold', debtAmount > 0 ? 'text-error' : 'text-success')}>
                        {formatCurrency(debtAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  Izoh
                </span>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={2}
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value)}
                  placeholder="Qo'shimcha ma'lumot..."
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={handleClosePurchaseModal} disabled={purchaseSaving}>
                Bekor qilish
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSavePurchase}
                disabled={purchaseSaving || !selectedSupplier || cartItems.length === 0}
              >
                {purchaseSaving && <span className="loading loading-spinner loading-sm" />}
                Saqlash va omborga kirim
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}

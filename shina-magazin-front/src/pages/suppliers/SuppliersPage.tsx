import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Truck,
  Phone,
  Mail,
  MapPin,
  Building2,
  X,
  AlertTriangle,
  Wallet,
  Users,
  CreditCard,
  ShoppingCart,
  Package,
  Calendar,
  TrendingUp,
  Trash2,
} from 'lucide-react';
import clsx from 'clsx';
import { suppliersApi } from '../../api/suppliers.api';
import { purchasesApi } from '../../api/purchases.api';
import { productsApi } from '../../api/products.api';
import { formatCurrency, formatDate } from '../../config/constants';
import { DataTable, Column } from '../../components/ui/DataTable';
import { ModalPortal } from '../../components/common/Modal';
import { useNotificationsStore } from '../../store/notificationsStore';
import type {
  Supplier,
  SupplierRequest,
  PurchaseOrder,
  PurchaseStats,
  PurchaseRequest,
  PurchaseItemRequest,
  Product,
} from '../../types';

const emptyFormData: SupplierRequest = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  bankDetails: '',
  notes: '',
};

type TabType = 'suppliers' | 'purchases';

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
}

export function SuppliersPage() {
  // Active tab
  const [activeTab, setActiveTab] = useState<TabType>('suppliers');

  // Suppliers state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<SupplierRequest>(emptyFormData);
  const [saving, setSaving] = useState(false);

  // Stats
  const [totalDebt, setTotalDebt] = useState(0);
  const [suppliersWithDebt, setSuppliersWithDebt] = useState<Supplier[]>([]);

  // Purchases state
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [purchasesInitialLoading, setPurchasesInitialLoading] = useState(true);
  const [purchasesRefreshing, setPurchasesRefreshing] = useState(false);
  const [purchasesPage, setPurchasesPage] = useState(0);
  const [purchasesPageSize, setPurchasesPageSize] = useState(20);
  const [purchasesTotalPages, setPurchasesTotalPages] = useState(0);
  const [purchasesTotalElements, setPurchasesTotalElements] = useState(0);
  const [purchaseStats, setPurchaseStats] = useState<PurchaseStats | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseSaving, setPurchaseSaving] = useState(false);

  // Purchase form state
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [purchaseNotes, setPurchaseNotes] = useState('');

  // Product search for purchase modal
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);

  const { notifications } = useNotificationsStore();
  const hasSearch = useMemo(() => search.trim().length > 0, [search]);

  // Calculate totals
  const cartTotal = useMemo(() =>
    cartItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
    [cartItems]
  );
  const cartTotalQuantity = useMemo(() =>
    cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );
  const debtAmount = useMemo(() => cartTotal - paidAmount, [cartTotal, paidAmount]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  const handlePurchasesPageSizeChange = (newSize: number) => {
    setPurchasesPageSize(newSize);
    setPurchasesPage(0);
  };

  const handleOpenEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      bankDetails: supplier.bankDetails || '',
      notes: supplier.notes || '',
    });
    setShowModal(true);
  };

  // Suppliers Table columns
  const suppliersColumns: Column<Supplier>[] = useMemo(() => [
    {
      key: 'name',
      header: "Ta'minotchi",
      render: (supplier) => (
        <div className="flex items-center gap-3">
          <div className="avatar placeholder">
            <div className="w-10 rounded-full bg-primary/15 text-primary">
              <span>{supplier.name.charAt(0).toUpperCase()}</span>
            </div>
          </div>
          <div>
            <div className="font-medium">{supplier.name}</div>
            {supplier.contactPerson && (
              <div className="text-sm text-base-content/70">{supplier.contactPerson}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: "Aloqa",
      render: (supplier) => (
        <div className="space-y-1">
          {supplier.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-base-content/50" />
              <span className="text-sm">{supplier.phone}</span>
            </div>
          )}
          {supplier.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-base-content/50" />
              <span className="text-sm text-base-content/70">{supplier.email}</span>
            </div>
          )}
          {!supplier.phone && !supplier.email && (
            <span className="text-sm text-base-content/50">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Manzil',
      className: 'max-w-xs',
      render: (supplier) => (
        supplier.address ? (
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-base-content/50 mt-0.5 shrink-0" />
            <span className="text-sm truncate">{supplier.address}</span>
          </div>
        ) : (
          <span className="text-sm text-base-content/50">—</span>
        )
      ),
    },
    {
      key: 'balance',
      header: 'Balans',
      getValue: (supplier) => supplier.balance,
      render: (supplier) => (
        <div>
          <span className={clsx(
            'font-medium',
            supplier.balance > 0 && 'text-error',
            supplier.balance < 0 && 'text-success',
            supplier.balance === 0 && 'text-base-content/70'
          )}>
            {supplier.balance > 0 && '+'}
            {formatCurrency(supplier.balance)}
          </span>
          {supplier.hasDebt && (
            <span className="badge badge-error badge-sm ml-2">Qarz</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      render: (supplier) => (
        <button
          className="btn btn-ghost btn-sm"
          onClick={(e) => { e.stopPropagation(); handleOpenEditModal(supplier); }}
        >
          Tahrirlash
        </button>
      ),
    },
  ], []);

  // Purchases Table columns
  const purchasesColumns: Column<PurchaseOrder>[] = useMemo(() => [
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
      key: 'status',
      header: 'Status',
      render: (purchase) => (
        <span className={clsx(
          'badge badge-sm',
          purchase.status === 'RECEIVED' && 'badge-success',
          purchase.status === 'DRAFT' && 'badge-warning',
          purchase.status === 'CANCELLED' && 'badge-error'
        )}>
          {purchase.status === 'RECEIVED' && 'Qabul qilingan'}
          {purchase.status === 'DRAFT' && 'Kutilmoqda'}
          {purchase.status === 'CANCELLED' && 'Bekor qilingan'}
        </span>
      ),
    },
  ], []);

  // Load suppliers
  const loadSuppliers = useCallback(async (isInitial = false) => {
    if (!isInitial) {
      setRefreshing(true);
    }
    try {
      const data = await suppliersApi.getAll({
        page,
        size: pageSize,
        search: search || undefined,
      });
      setSuppliers(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [page, pageSize, search]);

  // Load all active suppliers (for dropdown)
  const loadAllSuppliers = useCallback(async () => {
    try {
      const data = await suppliersApi.getActive();
      setAllSuppliers(data);
    } catch (error) {
      console.error('Failed to load all suppliers:', error);
    }
  }, []);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const [debt, withDebt] = await Promise.all([
        suppliersApi.getTotalDebt(),
        suppliersApi.getWithDebt(),
      ]);
      setTotalDebt(debt);
      setSuppliersWithDebt(withDebt);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  // Load purchases
  const loadPurchases = useCallback(async (isInitial = false) => {
    if (!isInitial) {
      setPurchasesRefreshing(true);
    }
    try {
      const data = await purchasesApi.getAll({
        page: purchasesPage,
        size: purchasesPageSize,
      });
      setPurchases(data.content);
      setPurchasesTotalPages(data.totalPages);
      setPurchasesTotalElements(data.totalElements);
    } catch (error) {
      console.error('Failed to load purchases:', error);
    } finally {
      setPurchasesInitialLoading(false);
      setPurchasesRefreshing(false);
    }
  }, [purchasesPage, purchasesPageSize]);

  // Load purchase stats
  const loadPurchaseStats = useCallback(async () => {
    try {
      const stats = await purchasesApi.getStats();
      setPurchaseStats(stats);
    } catch (error) {
      console.error('Failed to load purchase stats:', error);
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

  // Initial load for suppliers
  useEffect(() => {
    loadSuppliers(true);
    loadStats();
    loadAllSuppliers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when supplier filters change
  useEffect(() => {
    loadSuppliers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search]);

  // Initial load for purchases tab
  useEffect(() => {
    if (activeTab === 'purchases') {
      loadPurchases(true);
      loadPurchaseStats();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Reload when purchase filters change
  useEffect(() => {
    if (activeTab === 'purchases') {
      loadPurchases();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchasesPage, purchasesPageSize]);

  // Real-time updates
  useEffect(() => {
    if (notifications.length > 0) {
      loadSuppliers();
      loadStats();
      if (activeTab === 'purchases') {
        loadPurchases();
        loadPurchaseStats();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.length, activeTab]);

  // Supplier handlers
  const handleOpenNewModal = () => {
    setEditingSupplier(null);
    setFormData(emptyFormData);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSupplier(null);
    setFormData(emptyFormData);
  };

  const handleFormChange = (field: keyof SupplierRequest, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveSupplier = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      if (editingSupplier) {
        await suppliersApi.update(editingSupplier.id, formData);
      } else {
        await suppliersApi.create(formData);
      }
      handleCloseModal();
      loadSuppliers();
      loadStats();
      loadAllSuppliers();
    } catch (error) {
      console.error('Failed to save supplier:', error);
    } finally {
      setSaving(false);
    }
  };

  // Purchase handlers
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
        unitPrice: product.purchasePrice || product.sellingPrice * 0.7,
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
      loadStats();
    } catch (error) {
      console.error('Failed to save purchase:', error);
    } finally {
      setPurchaseSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title">Ta'minotchilar</h1>
          <p className="section-subtitle">Hamkorlar va yetkazib beruvchilar</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'suppliers' ? (
            <>
              <span className="pill">{totalElements} ta ta'minotchi</span>
              <button className="btn btn-primary" onClick={handleOpenNewModal}>
                <Plus className="h-5 w-5" />
                Yangi ta'minotchi
              </button>
            </>
          ) : (
            <>
              <span className="pill">{purchasesTotalElements} ta xarid</span>
              <button className="btn btn-primary" onClick={handleOpenPurchaseModal}>
                <Plus className="h-5 w-5" />
                Yangi xarid
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-base-200 p-1 w-fit">
        <button
          className={clsx('tab', activeTab === 'suppliers' && 'tab-active')}
          onClick={() => setActiveTab('suppliers')}
        >
          <Truck className="h-4 w-4 mr-2" />
          Ta'minotchilar
        </button>
        <button
          className={clsx('tab', activeTab === 'purchases' && 'tab-active')}
          onClick={() => setActiveTab('purchases')}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Xaridlar
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'suppliers' ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="surface-card p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-base-content/60">Jami ta'minotchilar</p>
                  <p className="text-xl font-bold">{totalElements}</p>
                </div>
              </div>
            </div>

            <div className="surface-card p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-warning/10 p-2.5">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-base-content/60">Qarzli ta'minotchilar</p>
                  <p className="text-xl font-bold">{suppliersWithDebt.length}</p>
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
                  <p className="text-xl font-bold text-error">{formatCurrency(totalDebt)}</p>
                </div>
              </div>
            </div>

            <div className="surface-card p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-success/10 p-2.5">
                  <CreditCard className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-base-content/60">Faol hamkorlar</p>
                  <p className="text-xl font-bold text-success">{totalElements - suppliersWithDebt.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="surface-card p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/50">
                  Qidiruv
                </h2>
                <p className="text-xs text-base-content/60">
                  {hasSearch ? "Qidiruv natijalari ko'rsatilmoqda" : "Barcha ta'minotchilar"}
                </p>
              </div>
            </div>
            <label className="form-control mt-4 max-w-md">
              <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                Nom, telefon yoki email
              </span>
              <div className="input-group">
                <span className="bg-base-200"><Search className="h-5 w-5" /></span>
                <input
                  type="text"
                  placeholder="Qidirish..."
                  className="input input-bordered w-full"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                />
              </div>
            </label>
          </div>

          {/* Suppliers Table */}
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
              data={suppliers}
              columns={suppliersColumns}
              keyExtractor={(supplier) => supplier.id}
              loading={initialLoading}
              emptyIcon={<Truck className="h-12 w-12" />}
            emptyTitle="Ta'minotchilar topilmadi"
            emptyDescription="Qidiruv so'zini o'zgartiring"
            rowClassName={(supplier) => (supplier.hasDebt ? 'bg-error/5' : '')}
            currentPage={page}
            totalPages={totalPages}
            totalElements={totalElements}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
            renderMobileCard={(supplier) => (
              <div className="surface-panel flex flex-col gap-3 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="avatar placeholder">
                      <div className="w-10 rounded-full bg-primary/15 text-primary">
                        <span>{supplier.name.charAt(0).toUpperCase()}</span>
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold">{supplier.name}</p>
                      <p className="text-xs text-base-content/60">
                        {supplier.contactPerson || "Mas'ul ko'rsatilmagan"}
                      </p>
                    </div>
                  </div>
                  <span className={clsx(
                    'badge badge-sm',
                    supplier.hasDebt ? 'badge-error' : 'badge-success'
                  )}>
                    {supplier.hasDebt ? 'Qarz' : 'Toza'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-sm text-base-content/70">
                      <Phone className="h-4 w-4" />
                      {supplier.phone}
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-sm text-base-content/70">
                      <Mail className="h-4 w-4" />
                      {supplier.email}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-base-200">
                  <span className={clsx(
                    'font-semibold',
                    supplier.balance > 0 && 'text-error',
                    supplier.balance <= 0 && 'text-success'
                  )}>
                    {supplier.balance > 0 && '+'}
                    {formatCurrency(supplier.balance)}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm min-h-[44px]"
                    onClick={() => handleOpenEditModal(supplier)}
                  >
                    Tahrirlash
                  </button>
                </div>
              </div>
            )}
          />
          </div>
        </>
      ) : (
        <>
          {/* Purchase Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                  <p className="text-xs text-base-content/60">Bugungi xaridlar</p>
                  <p className="text-xl font-bold">{purchaseStats?.todayPurchases || 0}</p>
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
                  <p className="text-xl font-bold">{formatCurrency(purchaseStats?.totalAmount || 0)}</p>
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
                  <p className="text-xl font-bold text-error">{formatCurrency(purchaseStats?.totalDebt || 0)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Purchases Table */}
          <div className="relative">
            {purchasesRefreshing && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-base-100/60 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                  <span className="text-sm font-medium text-base-content/70">Yangilanmoqda...</span>
                </div>
              </div>
            )}
            <DataTable
              data={purchases}
              columns={purchasesColumns}
              keyExtractor={(purchase) => purchase.id}
              loading={purchasesInitialLoading}
              emptyIcon={<ShoppingCart className="h-12 w-12" />}
            emptyTitle="Xaridlar topilmadi"
            emptyDescription="Yangi xarid qo'shish uchun tugmani bosing"
            currentPage={purchasesPage}
            totalPages={purchasesTotalPages}
            totalElements={purchasesTotalElements}
            pageSize={purchasesPageSize}
            onPageChange={setPurchasesPage}
            onPageSizeChange={handlePurchasesPageSizeChange}
            renderMobileCard={(purchase) => (
              <div className="surface-panel flex flex-col gap-3 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{purchase.supplierName}</p>
                    <p className="text-xs text-base-content/60">
                      {formatDate(purchase.orderDate)}
                    </p>
                  </div>
                  <span className={clsx(
                    'badge badge-sm',
                    purchase.status === 'RECEIVED' && 'badge-success',
                    purchase.status === 'DRAFT' && 'badge-warning',
                    purchase.status === 'CANCELLED' && 'badge-error'
                  )}>
                    {purchase.status === 'RECEIVED' && 'Qabul'}
                    {purchase.status === 'DRAFT' && 'Kutish'}
                    {purchase.status === 'CANCELLED' && 'Bekor'}
                  </span>
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
        </>
      )}

      {/* Supplier Modal */}
      <ModalPortal isOpen={showModal} onClose={handleCloseModal}>
        <div className="w-full max-w-2xl bg-base-100 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">
                  {editingSupplier ? "Ta'minotchini tahrirlash" : "Yangi ta'minotchi"}
                </h3>
                <p className="text-sm text-base-content/60">
                  {editingSupplier ? "Ta'minotchi ma'lumotlarini o'zgartirish" : "Yangi ta'minotchi qo'shish"}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleCloseModal}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              {/* Asosiy ma'lumotlar */}
              <div className="surface-soft rounded-xl p-4">
                <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Asosiy ma'lumotlar
                </h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="form-control sm:col-span-2">
                    <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                      Ta'minotchi nomi *
                    </span>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={formData.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      placeholder="Kompaniya nomi"
                    />
                  </label>
                  <label className="form-control">
                    <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                      Mas'ul shaxs
                    </span>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={formData.contactPerson}
                      onChange={(e) => handleFormChange('contactPerson', e.target.value)}
                      placeholder="Ism Familiya"
                    />
                  </label>
                  <label className="form-control">
                    <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                      Telefon
                    </span>
                    <input
                      type="tel"
                      className="input input-bordered w-full"
                      value={formData.phone}
                      onChange={(e) => handleFormChange('phone', e.target.value)}
                      placeholder="+998 90 123 45 67"
                    />
                  </label>
                </div>
              </div>

              {/* Aloqa ma'lumotlari */}
              <div className="surface-soft rounded-xl p-4">
                <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Aloqa ma'lumotlari
                </h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="form-control">
                    <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                      Email
                    </span>
                    <input
                      type="email"
                      className="input input-bordered w-full"
                      value={formData.email}
                      onChange={(e) => handleFormChange('email', e.target.value)}
                      placeholder="email@example.com"
                    />
                  </label>
                  <label className="form-control">
                    <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                      Manzil
                    </span>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={formData.address}
                      onChange={(e) => handleFormChange('address', e.target.value)}
                      placeholder="Shahar, tuman, ko'cha..."
                    />
                  </label>
                </div>
              </div>

              {/* Qo'shimcha ma'lumotlar */}
              <div className="surface-soft rounded-xl p-4">
                <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Qo'shimcha ma'lumotlar
                </h4>
                <div className="space-y-4">
                  <label className="form-control">
                    <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                      Bank rekvizitlari
                    </span>
                    <textarea
                      className="textarea textarea-bordered w-full"
                      rows={2}
                      value={formData.bankDetails}
                      onChange={(e) => handleFormChange('bankDetails', e.target.value)}
                      placeholder="Bank nomi, hisob raqami, MFO..."
                    />
                  </label>
                  <label className="form-control">
                    <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                      Izoh
                    </span>
                    <textarea
                      className="textarea textarea-bordered w-full"
                      rows={2}
                      value={formData.notes}
                      onChange={(e) => handleFormChange('notes', e.target.value)}
                      placeholder="Qo'shimcha ma'lumot..."
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={handleCloseModal} disabled={saving}>
                Bekor qilish
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveSupplier}
                disabled={saving || !formData.name.trim()}
              >
                {saving && <span className="loading loading-spinner loading-sm" />}
                {editingSupplier ? 'Yangilash' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>

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
                      const supplier = allSuppliers.find(s => s.id === Number(e.target.value));
                      setSelectedSupplier(supplier || null);
                    }}
                  >
                    <option value="">Ta'minotchini tanlang</option>
                    {allSuppliers.map(supplier => (
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
                              {product.sku} • Zaxira: {product.quantity}
                            </p>
                          </div>
                          <span className="text-sm font-semibold">
                            {formatCurrency(product.purchasePrice || product.sellingPrice * 0.7)}
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

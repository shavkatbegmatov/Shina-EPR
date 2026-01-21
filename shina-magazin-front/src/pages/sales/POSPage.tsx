import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Minus, Trash2, ShoppingCart, User, X, Users, ArrowRight, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { productsApi } from '../../api/products.api';
import { salesApi } from '../../api/sales.api';
import { customersApi } from '../../api/customers.api';
import { useCartStore } from '../../store/cartStore';
import { useNotificationsStore } from '../../store/notificationsStore';
import { formatCurrency, PAYMENT_METHODS, CUSTOMER_TYPES } from '../../config/constants';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { PercentInput } from '../../components/ui/PercentInput';
import { Select } from '../../components/ui/Select';
import { DataTable, Column } from '../../components/ui/DataTable';
import { ModalPortal } from '../../components/common/Modal';
import { SearchInput } from '../../components/ui/SearchInput';
import { CustomerSearchCombobox } from '../../components/common/NamePhoneSearchCombobox';
import type { Product, PaymentMethod, Customer } from '../../types';

export function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paidAmount, setPaidAmount] = useState(0);

  // Customer search state
  const [customerSearch, setCustomerSearch] = useState('');

  // Modal state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [modalCustomers, setModalCustomers] = useState<Customer[]>([]);
  const [modalPage, setModalPage] = useState(0);
  const [modalPageSize, setModalPageSize] = useState(20);
  const [modalTotalPages, setModalTotalPages] = useState(0);
  const [modalTotalElements, setModalTotalElements] = useState(0);
  const [modalLoading, setModalLoading] = useState(false);

  const cart = useCartStore();
  const { notifications } = useNotificationsStore();
  const loadProducts = useCallback(async () => {
    try {
      const data = await productsApi.getAll({
        search: search || undefined,
        size: 50,
      });
      setProducts(data.content);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }, [search]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // WebSocket orqali yangi notification kelganda mahsulotlarni yangilash (zaxira o'zgarishi)
  useEffect(() => {
    if (notifications.length > 0) {
      loadProducts();
    }
  }, [notifications.length, loadProducts]);

  const handleSelectCustomer = (customer: Customer) => {
    cart.setCustomer(customer);
    setCustomerSearch('');
  };

  const handleClearCustomer = () => {
    cart.setCustomer(null);
  };

  const loadModalCustomers = useCallback(async () => {
    setModalLoading(true);
    try {
      const data = await customersApi.getAll({
        page: modalPage,
        size: modalPageSize,
        search: customerSearch || undefined,
      });
      setModalCustomers(data.content);
      setModalTotalPages(data.totalPages);
      setModalTotalElements(data.totalElements);
    } catch (error) {
      console.error('Failed to load customers:', error);
      toast.error('Mijozlarni yuklashda xatolik');
    } finally {
      setModalLoading(false);
    }
  }, [modalPage, modalPageSize, customerSearch]);

  useEffect(() => {
    if (showCustomerModal) {
      loadModalCustomers();
    }
  }, [showCustomerModal, loadModalCustomers]);

  const handleOpenModal = () => {
    setModalPage(0);
    setShowCustomerModal(true);
  };

  const handleModalSelectCustomer = (customer: Customer) => {
    cart.setCustomer(customer);
    setCustomerSearch('');
    setShowCustomerModal(false);
  };

  const handleModalPageSizeChange = (size: number) => {
    setModalPageSize(size);
    setModalPage(0);
  };

  const columns: Column<Customer>[] = useMemo(() => [
    {
      key: 'fullName',
      header: 'Mijoz',
      render: (customer) => (
        <div className="flex items-center gap-3">
          <div className="avatar placeholder">
            <div className="w-10 rounded-full bg-primary/15 text-primary">
              <span>{customer.fullName.charAt(0).toUpperCase()}</span>
            </div>
          </div>
          <div>
            <div className="font-medium">{customer.fullName}</div>
            {customer.companyName && (
              <div className="text-sm text-base-content/70">
                {customer.companyName}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Telefon',
      render: (customer) => (
        <div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-base-content/50" />
            {customer.phone}
          </div>
          {customer.phone2 && (
            <div className="text-sm text-base-content/70">{customer.phone2}</div>
          )}
        </div>
      ),
    },
    {
      key: 'customerType',
      header: 'Turi',
      render: (customer) => (
        <span className="badge badge-outline badge-sm">
          {CUSTOMER_TYPES[customer.customerType]?.label}
        </span>
      ),
    },
    {
      key: 'balance',
      header: 'Balans',
      render: (customer) => (
        <div>
          <span
            className={clsx(
              'font-medium',
              customer.balance < 0 && 'text-error',
              customer.balance > 0 && 'text-success'
            )}
          >
            {formatCurrency(customer.balance)}
          </span>
          {customer.hasDebt && (
            <span className="badge badge-error badge-sm ml-2">Qarz</span>
          )}
        </div>
      ),
    },
  ], []);

  const handleCompleteSale = async () => {
    if (cart.items.length === 0) {
      toast.error('Savat bo\'sh');
      return;
    }

    setLoading(true);
    try {
      await salesApi.create({
        customerId: cart.customer?.id,
        items: cart.items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          discount: item.discount,
        })),
        discountAmount: cart.discount,
        discountPercent: cart.discountPercent,
        paidAmount,
        paymentMethod,
      });

      toast.success('Sotuv muvaffaqiyatli yakunlandi!');
      cart.clear();
      setShowPayment(false);
      setPaidAmount(0);
      loadProducts();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const total = cart.getTotal();
  const subtotal = cart.getSubtotal();
  const discountAmount = cart.getDiscountAmount();
  const itemCount = cart.getItemCount();
  const change = paidAmount - total;
  const isDebt = change < 0;

  const discountSummary = useMemo(() => {
    // So'm kiritilsa → foizda ko'rsat
    if (cart.discount > 0 && subtotal > 0) {
      const percent = ((cart.discount / subtotal) * 100).toFixed(1);
      return `-${percent}%`;
    }
    // Foiz kiritilsa → so'mda ko'rsat
    if (cart.discountPercent > 0) {
      const amount = (subtotal * cart.discountPercent) / 100;
      return `-${formatCurrency(amount)}`;
    }
    return null;
  }, [cart.discount, cart.discountPercent, subtotal]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* Products Grid */}
      <section className="surface-card flex min-h-[60vh] flex-col overflow-hidden">
        <div className="border-b border-base-200 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Mahsulotlar</h2>
              <p className="text-xs text-base-content/60">
                {products.length} ta mahsulot topildi
              </p>
            </div>
            <SearchInput
              value={search}
              onValueChange={setSearch}
              label="Mahsulot qidirish"
              placeholder="Mahsulot qidirish..."
              hideLabel
              className="w-full md:max-w-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <button
                key={product.id}
                className={clsx(
                  'surface-panel group flex h-full flex-col justify-between rounded-xl p-3 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]',
                  product.quantity === 0 && 'cursor-not-allowed opacity-60'
                )}
                disabled={product.quantity === 0}
                onClick={() => cart.addItem(product)}
              >
                <div>
                  <h3 className="text-sm font-semibold line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="mt-1 text-xs text-base-content/60">
                    {product.sizeString || "O'lcham ko'rsatilmagan"}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-primary">
                    {formatCurrency(product.sellingPrice)}
                  </span>
                  <span
                    className={clsx(
                      'badge badge-sm',
                      product.quantity === 0
                        ? 'badge-error'
                        : product.lowStock
                        ? 'badge-warning'
                        : 'badge-success'
                    )}
                  >
                    {product.quantity}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Cart */}
      <aside className="surface-card flex min-h-[60vh] flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-base-200 p-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ShoppingCart className="h-5 w-5" />
              Savat
            </h2>
            <p className="text-xs text-base-content/60">
              {itemCount} ta mahsulot
            </p>
          </div>
          {cart.items.length > 0 && (
            <button
              className="btn btn-ghost btn-sm text-error"
              onClick={() => cart.clear()}
            >
              Tozalash
            </button>
          )}
        </div>

        {/* Customer Selection */}
        <div className="border-b border-base-200 p-4">
          {cart.customer ? (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-primary/10 p-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-content">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{cart.customer.fullName}</p>
                  <p className="text-xs text-base-content/60">{cart.customer.phone}</p>
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm btn-circle"
                onClick={handleClearCustomer}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <CustomerSearchCombobox
                  value={customerSearch}
                  onChange={setCustomerSearch}
                  onSelect={handleSelectCustomer}
                  placeholder="Mijozni qidirish..."
                  getSubtitle={(customer) => {
                    const parts = [];
                    if (customer.companyName) parts.push(customer.companyName);
                    if (customer.hasDebt) parts.push('Qarz bor');
                    return parts.join(' • ') || undefined;
                  }}
                  dropdownFooter={
                    <button
                      className="w-full px-4 py-3 text-left transition-colors hover:bg-base-200 flex items-center justify-between gap-2 text-sm font-medium text-primary"
                      onClick={handleOpenModal}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>Barchasini ko'rish</span>
                      </div>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  }
                />
              </div>
              <button
                className="btn btn-primary btn-sm h-12"
                onClick={handleOpenModal}
                title="Barcha mijozlarni ko'rish"
              >
                <Users className="h-5 w-5" />
                <span className="hidden sm:inline ml-1">Ko'rish</span>
              </button>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-auto p-4">
          {cart.items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-base-content/50">
              <ShoppingCart className="mb-2 h-12 w-12" />
              <p>Savat bo'sh</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.items.map((item) => (
                <div
                  key={item.product.id}
                  className="surface-soft flex gap-3 rounded-xl p-3"
                >
                  <div className="flex-1">
                    <h4 className="text-sm font-medium">{item.product.name}</h4>
                    <p className="text-xs text-base-content/70">
                      {formatCurrency(item.product.sellingPrice)} x{' '}
                      {item.quantity}
                    </p>
                    {item.discount > 0 && (
                      <p className="text-xs text-success">
                        Chegirma: {formatCurrency(item.discount)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="btn btn-ghost btn-sm btn-circle h-11 w-11"
                      onClick={() =>
                        cart.updateQuantity(
                          item.product.id,
                          item.quantity - 1
                        )
                      }
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-sm">
                      {item.quantity}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm btn-circle h-11 w-11"
                      onClick={() =>
                        cart.updateQuantity(
                          item.product.id,
                          item.quantity + 1
                        )
                      }
                      disabled={item.quantity >= item.product.quantity}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm btn-circle h-11 w-11 text-error"
                      onClick={() => cart.removeItem(item.product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Discount */}
        <div className="border-t border-base-200 p-4">
          <div className="surface-soft space-y-3 rounded-xl p-3">
            <div className="flex items-center justify-between text-sm">
              <span>Sub-jami</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <CurrencyInput
                label="Chegirma (so'm)"
                value={cart.discount}
                onChange={(val) => cart.setDiscount(Math.min(subtotal, Math.max(0, val)))}
                min={0}
                max={subtotal}
                size="sm"
              />
              <PercentInput
                label="Chegirma (%)"
                value={cart.discountPercent}
                onChange={(val) => cart.setDiscountPercent(val)}
                min={0}
                max={100}
                size="sm"
              />
            </div>
            <div className={clsx(
              'flex items-center justify-between text-sm transition-opacity duration-200',
              discountSummary ? 'opacity-100' : 'opacity-0'
            )}>
              <span className="text-base-content/60">Chegirma:</span>
              <span className="font-semibold text-success">{discountSummary || '-'}</span>
            </div>
          </div>
        </div>

        {/* Cart Total */}
        <div className="border-t border-base-200 p-4 space-y-3">
          <div className="flex items-center justify-between text-lg">
            <span>Jami:</span>
            <span className="font-bold">{formatCurrency(total)}</span>
          </div>
          <button
            className="btn btn-primary btn-block"
            disabled={cart.items.length === 0}
            onClick={() => {
              setPaidAmount(total);
              setShowPayment(true);
            }}
          >
            To'lovga o'tish
          </button>
        </div>
      </aside>

      {/* Payment Modal */}
      <ModalPortal isOpen={showPayment} onClose={() => setShowPayment(false)}>
        <div className="w-full max-w-lg bg-base-100 rounded-2xl shadow-2xl relative">
          <div className="p-4 sm:p-6">
            <button
              className="btn btn-circle btn-ghost btn-sm absolute right-4 top-4"
              onClick={() => setShowPayment(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-semibold">To'lov</h3>
            <p className="text-sm text-base-content/60">
              {itemCount} ta mahsulot · {formatCurrency(total)}
            </p>

            <div className="mt-6 space-y-4">
              <Select
                label="To'lov usuli"
                value={paymentMethod}
                onChange={(val) => setPaymentMethod(val as PaymentMethod)}
                options={Object.entries(PAYMENT_METHODS).map(([key, { label }]) => ({
                  value: key,
                  label,
                }))}
                placeholder="To'lov usulini tanlang"
              />

              <CurrencyInput
                label="To'langan summa"
                value={paidAmount}
                onChange={(val) => setPaidAmount(Math.max(0, val))}
                min={0}
                showQuickButtons
              />

              <div className="surface-soft rounded-xl p-4">
                <div className="flex justify-between text-sm">
                  <span>Sub-jami:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span>Chegirma:</span>
                  <span>{discountAmount ? formatCurrency(discountAmount) : '—'}</span>
                </div>
                <div className="divider my-3"></div>
                <div className="flex justify-between text-lg">
                  <span>Jami:</span>
                  <span className="font-bold">{formatCurrency(total)}</span>
                </div>
                <div className="mt-3 flex justify-between text-sm">
                  <span>{isDebt ? 'Qarz:' : 'Qaytim:'}</span>
                  <span
                    className={clsx(
                      'font-semibold',
                      isDebt ? 'text-error' : 'text-success'
                    )}
                  >
                    {formatCurrency(Math.abs(change))}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="btn btn-ghost"
                onClick={() => setShowPayment(false)}
              >
                Bekor qilish
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCompleteSale}
                disabled={loading}
              >
                {loading ? (
                  <span className="loading loading-spinner" />
                ) : (
                  'Tasdiqlash'
                )}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Customer Selection Modal */}
      <ModalPortal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
      >
        <div className="w-full max-w-5xl bg-base-100 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-base-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">Mijozlarni tanlash</h3>
                <p className="text-sm text-base-content/60 mt-1">
                  Jami {modalTotalElements} ta mijoz
                </p>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowCustomerModal(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search */}
            <div className="mt-4">
              <SearchInput
                value={customerSearch}
                onValueChange={(value) => {
                  setCustomerSearch(value);
                  setModalPage(0);
                }}
                placeholder="Ism, telefon yoki kompaniya nomi bo'yicha qidirish..."
                hideLabel
              />
            </div>
          </div>

          {/* DataTable */}
          <div className="flex-1 overflow-auto">
            <DataTable
              data={modalCustomers}
              columns={columns}
              keyExtractor={(customer) => customer.id}
              loading={modalLoading}
              onRowClick={handleModalSelectCustomer}
              rowClassName={(customer) =>
                clsx(
                  'cursor-pointer',
                  customer.hasDebt && 'bg-error/5'
                )
              }
              currentPage={modalPage}
              totalPages={modalTotalPages}
              totalElements={modalTotalElements}
              pageSize={modalPageSize}
              onPageChange={setModalPage}
              onPageSizeChange={handleModalPageSizeChange}
              emptyIcon={<Users className="h-12 w-12" />}
              emptyTitle="Mijozlar topilmadi"
              emptyDescription="Qidiruv so'zini o'zgartiring yoki yangi mijoz qo'shing"
              renderMobileCard={(customer) => (
                <div
                  className="p-4 border border-base-200 rounded-lg bg-base-100 cursor-pointer hover:bg-base-200 transition"
                  onClick={() => handleModalSelectCustomer(customer)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="avatar placeholder">
                      <div className="w-10 rounded-full bg-primary/15 text-primary">
                        <span>{customer.fullName.charAt(0).toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{customer.fullName}</div>
                      {customer.companyName && (
                        <div className="text-sm text-base-content/70">
                          {customer.companyName}
                        </div>
                      )}
                    </div>
                    {customer.hasDebt && (
                      <span className="badge badge-error badge-sm">Qarz</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-base-content/70">
                      <Phone className="h-4 w-4" />
                      {customer.phone}
                    </div>
                    <div className={clsx(
                      'font-medium',
                      customer.balance < 0 && 'text-error',
                      customer.balance > 0 && 'text-success'
                    )}>
                      {formatCurrency(customer.balance)}
                    </div>
                  </div>
                </div>
              )}
            />
          </div>
        </div>
      </ModalPortal>

    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, User } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { productsApi } from '../../api/products.api';
import { salesApi } from '../../api/sales.api';
import { useCartStore } from '../../store/cartStore';
import { formatCurrency, PAYMENT_METHODS } from '../../config/constants';
import type { Product, PaymentMethod } from '../../types';

export function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paidAmount, setPaidAmount] = useState(0);

  const cart = useCartStore();

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
    if (cart.discount > 0) {
      return `-${formatCurrency(cart.discount)}`;
    }
    if (cart.discountPercent > 0) {
      return `-${cart.discountPercent}%`;
    }
    return null;
  }, [cart.discount, cart.discountPercent]);

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
            <div className="form-control w-full md:max-w-sm">
              <div className="input-group">
                <span className="bg-base-200">
                  <Search className="h-5 w-5" />
                </span>
                <input
                  type="text"
                  placeholder="Mahsulot qidirish..."
                  className="input input-bordered w-full"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
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
          <button className="btn btn-outline btn-sm w-full gap-2">
            <User className="h-4 w-4" />
            {cart.customer ? cart.customer.fullName : 'Mijoz tanlash'}
          </button>
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
              <label className="form-control">
                <span className="label-text text-xs">Chegirma (so'm)</span>
                <input
                  type="number"
                  min={0}
                  className="input input-bordered input-sm w-full"
                  value={cart.discount}
                  onChange={(e) =>
                    cart.setDiscount(
                      Math.min(subtotal, Math.max(0, Number(e.target.value)))
                    )
                  }
                />
              </label>
              <label className="form-control">
                <span className="label-text text-xs">Chegirma (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="input input-bordered input-sm w-full"
                  value={cart.discountPercent}
                  onChange={(e) =>
                    cart.setDiscountPercent(
                      Math.min(100, Math.max(0, Number(e.target.value)))
                    )
                  }
                />
              </label>
            </div>
            {discountSummary && (
              <div className="text-xs text-success">
                Umumiy chegirma: {discountSummary}
              </div>
            )}
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
      {showPayment && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="text-lg font-semibold">To'lov</h3>
            <p className="text-sm text-base-content/60">
              {itemCount} ta mahsulot · {formatCurrency(total)}
            </p>

            <div className="mt-6 space-y-4">
              <label className="form-control">
                <span className="label-text">To'lov usuli</span>
                <select
                  className="select select-bordered w-full"
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as PaymentMethod)
                  }
                >
                  {Object.entries(PAYMENT_METHODS).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">To'langan summa</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    className="input input-bordered w-full"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                  />
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setPaidAmount(total)}
                  >
                    To'liq
                  </button>
                </div>
              </div>

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

            <div className="modal-action">
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
      )}
    </div>
  );
}

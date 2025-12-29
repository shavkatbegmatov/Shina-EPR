import { useCallback, useEffect, useState } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, User } from 'lucide-react';
import toast from 'react-hot-toast';
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
  const change = paidAmount - total;

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)]">
      {/* Products Grid */}
      <div className="flex-1 flex flex-col bg-base-100 rounded-lg shadow-sm border border-base-200 overflow-hidden">
        <div className="p-4 border-b border-base-200">
          <div className="form-control">
            <div className="input-group">
              <span className="bg-base-200">
                <Search className="w-5 h-5" />
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

        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {products.map((product) => (
              <button
                key={product.id}
                className="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer disabled:opacity-50"
                disabled={product.quantity === 0}
                onClick={() => cart.addItem(product)}
              >
                <div className="card-body p-3">
                  <h3 className="font-medium text-sm line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-xs text-base-content/70">
                    {product.sizeString}
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-bold text-primary">
                      {formatCurrency(product.sellingPrice)}
                    </span>
                    <span
                      className={`badge badge-sm ${
                        product.quantity === 0
                          ? 'badge-error'
                          : product.lowStock
                          ? 'badge-warning'
                          : 'badge-success'
                      }`}
                    >
                      {product.quantity}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart */}
      <div className="w-full lg:w-96 flex flex-col bg-base-100 rounded-lg shadow-sm border border-base-200 overflow-hidden">
        <div className="p-4 border-b border-base-200 flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Savat
          </h2>
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
        <div className="p-4 border-b border-base-200">
          <button className="btn btn-outline btn-sm w-full gap-2">
            <User className="w-4 h-4" />
            {cart.customer ? cart.customer.fullName : 'Mijoz tanlash'}
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-auto p-4">
          {cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-base-content/50">
              <ShoppingCart className="w-12 h-12 mb-2" />
              <p>Savat bo'sh</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex gap-3 bg-base-200 p-3 rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{item.product.name}</h4>
                    <p className="text-xs text-base-content/70">
                      {formatCurrency(item.product.sellingPrice)} x{' '}
                      {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="btn btn-ghost btn-xs btn-circle"
                      onClick={() =>
                        cart.updateQuantity(
                          item.product.id,
                          item.quantity - 1
                        )
                      }
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      className="btn btn-ghost btn-xs btn-circle"
                      onClick={() =>
                        cart.updateQuantity(
                          item.product.id,
                          item.quantity + 1
                        )
                      }
                      disabled={item.quantity >= item.product.quantity}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      className="btn btn-ghost btn-xs btn-circle text-error"
                      onClick={() => cart.removeItem(item.product.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Total */}
        <div className="p-4 border-t border-base-200 space-y-3">
          <div className="flex justify-between text-lg">
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
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">To'lov</h3>

            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">To'lov usuli</span>
                </label>
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
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">To'langan summa</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                />
              </div>

              <div className="bg-base-200 p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span>Jami:</span>
                  <span className="font-bold">{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>To'langan:</span>
                  <span>{formatCurrency(paidAmount)}</span>
                </div>
                <div className="divider my-2"></div>
                <div className="flex justify-between text-lg">
                  <span>{change >= 0 ? 'Qaytim:' : 'Qarz:'}</span>
                  <span
                    className={`font-bold ${
                      change < 0 ? 'text-error' : 'text-success'
                    }`}
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

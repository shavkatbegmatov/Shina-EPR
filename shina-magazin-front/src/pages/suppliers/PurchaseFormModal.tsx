import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, Trash2, X } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Button } from '@/ui';
import { purchasesApi } from '../../api/purchases.api';
import { productsApi } from '../../api/products.api';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatCurrency, getTashkentToday } from '../../config/constants';
import { queryKeys } from '../../lib/queryKeys';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { ModalPortal } from '../../components/common/Modal';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import {
  addToCart,
  cartTotal,
  cartTotalQuantity,
  initialUnitPrice,
  removeFromCart,
  updateCartItem,
  type CartItem,
} from './purchaseCart';
import type { Product, PurchaseItemRequest, PurchaseRequest, Supplier } from '../../types';

interface Props {
  isOpen: boolean;
  /** Tanlash uchun barcha faol ta'minotchilar (sahifalangan ro'yxat emas). */
  suppliers: Supplier[];
  onClose: () => void;
}

/**
 * Yangi xarid oynasi.
 *
 * <p>Holat ATAYLAB ichkarida: `ModalPortal` yopilganda bolalarini unmount
 * qiladi, ya'ni savat, tanlangan ta'minotchi va izohlar har ochilishda
 * o'z-o'zidan tozalanadi. Ilgari buni sahifa qo'lda qilardi — ochish va
 * yopish handler'larida bir xil 6 qator takrorlangan edi.
 */
export function PurchaseFormModal({ isOpen, suppliers, onClose }: Props) {
  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <PurchaseForm suppliers={suppliers} onClose={onClose} />
    </ModalPortal>
  );
}

function PurchaseForm({ suppliers, onClose }: Pick<Props, 'suppliers' | 'onClose'>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [purchaseDate, setPurchaseDate] = useState(getTashkentToday());
  const [items, setItems] = useState<CartItem[]>([]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState('');

  const [productSearch, setProductSearch] = useState('');
  // Har bosilgan harfda so'rov yubormaslik uchun kechiktiriladi
  const debouncedSearch = useDebouncedValue(productSearch.trim(), 300);

  const total = useMemo(() => cartTotal(items), [items]);
  const totalQuantity = useMemo(() => cartTotalQuantity(items), [items]);
  const debtAmount = total - paidAmount;

  const productQuery = useQuery({
    queryKey: queryKeys.products.search(debouncedSearch),
    queryFn: () => productsApi.getAll({ search: debouncedSearch, size: 10 }),
    enabled: debouncedSearch.length > 0,
  });

  // Qidiruv maydoni bo'shatilganda ro'yxat DARHOL yopilishi kerak —
  // kechiktirilgan qiymatni kutib turish dropdown'ni osilib qoldirardi.
  const productResults = productSearch.trim() ? productQuery.data?.content ?? [] : [];

  const save = useMutation({
    mutationFn: (request: PurchaseRequest) => purchasesApi.create(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all });
      // Xarid ta'minotchi balansini o'zgartiradi — qarz statistikasi ham
      // eskiradi, shuning uchun ikkala tarmoq bekor qilinadi.
      void queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
      onClose();
    },
    onError: (error) => {
      console.error('Failed to save purchase:', error);
      toast.error(getApiErrorMessage(error));
    },
  });

  const saving = save.isPending;

  const handleAdd = (product: Product) => {
    setItems((prev) => addToCart(prev, product));
    setProductSearch('');
  };

  const handleSave = () => {
    if (!selectedSupplier || items.length === 0) return;

    save.mutate({
      supplierId: selectedSupplier.id,
      orderDate: purchaseDate,
      paidAmount,
      notes: notes || undefined,
      items: items.map<PurchaseItemRequest>((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });
  };

  const labelClass =
    'label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50';

  return (
    <div className="w-full max-w-4xl bg-base-100 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold">{t('erp.suppliers.newPurchase')}</h3>
            <p className="text-sm text-base-content/60">
              {t('erp.suppliers.newPurchaseSubtitle')}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label={t('erp.suppliers.fieldSupplierSelect')}
              value={selectedSupplier?.id || ''}
              onChange={(value) =>
                setSelectedSupplier(suppliers.find((s) => s.id === Number(value)) || null)
              }
              placeholder={t('erp.suppliers.phSelectSupplier')}
              options={suppliers.map((supplier) => ({
                value: supplier.id,
                label: supplier.name,
              }))}
            />
            <label className="form-control">
              <span className={labelClass}>{t('erp.suppliers.fieldDate')}</span>
              <input
                type="date"
                className="input input-bordered w-full"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </label>
          </div>

          <div className="surface-soft rounded-xl p-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4 flex items-center gap-2">
              <Package className="h-4 w-4" />
              {t('erp.suppliers.sectionProducts')}
            </h4>

            <div className="relative mb-4">
              <SearchInput
                value={productSearch}
                onValueChange={setProductSearch}
                label={t('erp.suppliers.productSearchLabel')}
                placeholder={t('erp.suppliers.productSearchPlaceholder')}
                onClear={() => setProductSearch('')}
              />
              {productResults.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {productResults.map((product) => (
                    <button
                      key={product.id}
                      className="w-full p-3 text-left hover:bg-base-200 flex items-center justify-between"
                      onClick={() => handleAdd(product)}
                    >
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-base-content/60">
                          {product.sku} •{' '}
                          {t('erp.suppliers.stockLabel', { quantity: product.quantity })}
                        </p>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatCurrency(initialUnitPrice(product))}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {productQuery.isFetching && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-base-100 border border-base-300 rounded-lg p-4 text-center">
                  <span className="loading loading-spinner loading-sm" />
                </div>
              )}
            </div>

            {items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>{t('erp.suppliers.colProduct')}</th>
                      <th className="w-28">{t('erp.suppliers.colQuantity')}</th>
                      <th className="w-36">{t('erp.suppliers.colPrice')}</th>
                      <th className="w-32 text-right">{t('common.amount')}</th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
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
                            onChange={(e) =>
                              setItems((prev) =>
                                updateCartItem(
                                  prev,
                                  item.product.id,
                                  'quantity',
                                  Number(e.target.value) || 1
                                )
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            className="input input-bordered input-sm w-full"
                            value={item.unitPrice}
                            onChange={(e) =>
                              setItems((prev) =>
                                updateCartItem(
                                  prev,
                                  item.product.id,
                                  'unitPrice',
                                  Number(e.target.value) || 0
                                )
                              )
                            }
                          />
                        </td>
                        <td className="text-right font-semibold">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </td>
                        <td>
                          <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            className="text-error"
                            onClick={() => setItems((prev) => removeFromCart(prev, item.product.id))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-base-content/50">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t('erp.suppliers.cartEmpty')}</p>
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="surface-soft rounded-xl p-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/70">
                    {t('erp.suppliers.summaryTotalProducts')}
                  </span>
                  <span className="font-medium">
                    {t('erp.suppliers.quantityPcs', { quantity: totalQuantity })}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-semibold">
                  <span>{t('erp.suppliers.summaryTotalAmount')}</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <div className="divider my-2"></div>
                <label className="form-control">
                  <span className={labelClass}>{t('erp.suppliers.fieldPaidAmount')}</span>
                  <input
                    type="number"
                    min={0}
                    max={total}
                    className="input input-bordered w-full"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                  />
                </label>
                <div className="flex justify-between text-lg">
                  <span className="text-base-content/70">{t('erp.suppliers.summaryDebt')}</span>
                  <span
                    className={clsx(
                      'font-semibold',
                      debtAmount > 0 ? 'text-error' : 'text-success'
                    )}
                  >
                    {formatCurrency(debtAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <label className="form-control">
            <span className={labelClass}>{t('erp.suppliers.fieldNotes')}</span>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('erp.suppliers.phNotes')}
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving || !selectedSupplier || items.length === 0}
          >
            {saving && <span className="loading loading-spinner loading-sm" />}
            {t('erp.suppliers.savePurchase')}
          </Button>
        </div>
      </div>
    </div>
  );
}

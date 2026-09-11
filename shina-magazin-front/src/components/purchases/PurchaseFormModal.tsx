import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Info, Package, Trash2, Truck, X } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Button } from '@/ui';
import { purchasesApi } from '../../api/purchases.api';
import { productsApi } from '../../api/products.api';
import { getApiErrorMessage } from '../../utils/apiError';
import {
  formatCurrency,
  formatForeign,
  getTashkentToday,
  PURCHASE_CURRENCIES,
} from '../../config/constants';
import { queryKeys } from '../../lib/queryKeys';
import { invalidateAfter } from '../../lib/invalidation';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { ModalPortal } from '../common/Modal';
import { ProductSearchCombobox } from '../common/ProductSearchCombobox';
import { Select } from '../ui/Select';
import { computePurchasePricing, toUzs } from '../../shared/purchasePricing';
import {
  addToCart,
  initialUnitPrice,
  removeFromCart,
  updateCartItem,
  type CartItem,
  type CartItemField,
} from '../../shared/purchaseCart';
import type {
  Product,
  PurchaseCurrency,
  PurchaseItemRequest,
  PurchaseRequest,
  Supplier,
} from '../../types';

interface Props {
  isOpen: boolean;
  /** Tanlash uchun barcha faol ta'minotchilar (sahifalangan ro'yxat emas). */
  suppliers: Supplier[];
  onClose: () => void;
  /** Ta'minotchi sahifasidan ochilganda oldindan tanlangan ta'minotchi. */
  defaultSupplierId?: number;
}

/**
 * Kirim hujjati oynasi — ta'minotchi yuk xati shablonida.
 *
 * <p>Xaridlar va Ta'minotchilar sahifalari uchun BITTA forma (ilgari ikki
 * nusxa edi va ajralib ketgan edi). Hujjat o'z valyutasida kiritiladi
 * (ko'pincha USD), kurs bilan birga saqlanadi; so'mdagi summalar, bonus va
 * tannarx bu yerda faqat ko'rsatish uchun hisoblanadi — server o'zi qayta
 * hisoblab yozadi (`purchasePricing` ikkalasida bir xil qoida).
 *
 * <p>Holat ATAYLAB ichkarida: `ModalPortal` yopilganda bolalarini unmount
 * qiladi, ya'ni savat va maydonlar har ochilishda o'z-o'zidan tozalanadi.
 */
export function PurchaseFormModal({ isOpen, suppliers, onClose, defaultSupplierId }: Props) {
  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <PurchaseForm suppliers={suppliers} onClose={onClose} defaultSupplierId={defaultSupplierId} />
    </ModalPortal>
  );
}

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/** Hujjat valyutasiga mos yaxlitlash: dollarda tiyin bor, so'mda yo'q. */
const roundForCurrency = (value: number, currency: PurchaseCurrency) =>
  currency === 'UZS' ? Math.round(value) : round2(value);

function PurchaseForm({
  suppliers,
  onClose,
  defaultSupplierId,
}: Pick<Props, 'suppliers' | 'onClose' | 'defaultSupplierId'>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // ─── Hujjat ───
  const [supplierId, setSupplierId] = useState<number | ''>(defaultSupplierId ?? '');
  const [orderDate, setOrderDate] = useState(getTashkentToday());
  const [supplierDocNumber, setSupplierDocNumber] = useState('');
  const [supplierDocDate, setSupplierDocDate] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [currency, setCurrency] = useState<PurchaseCurrency>('UZS');
  const [exchangeRate, setExchangeRate] = useState(0);
  /** Kassir kursni o'zi yozgan bo'lsa, taklif qilingan kurs uni ustidan yozmasin. */
  const rateTouched = useRef(false);

  // ─── Qatorlar va yakun ───
  const [items, setItems] = useState<CartItem[]>([]);
  const [transportCost, setTransportCost] = useState(0);
  /** Hujjat valyutasida (USD hujjatda dollarda) — serverga so'mga aylantirib yuboriladi. */
  const [paidAmount, setPaidAmount] = useState(0);
  const [receiveNow, setReceiveNow] = useState(true);
  const [notes, setNotes] = useState('');

  const [productSearch, setProductSearch] = useState('');
  // Har bosilgan harfda so'rov yubormaslik uchun kechiktiriladi
  const debouncedSearch = useDebouncedValue(productSearch.trim(), 300);

  const productQuery = useQuery({
    queryKey: queryKeys.products.search(debouncedSearch),
    queryFn: () => productsApi.getAll({ search: debouncedSearch, size: 10 }),
    enabled: debouncedSearch.length > 0,
  });

  // Oxirgi USD hujjatdagi kurs — taklif (statistika allaqachon keshda bo'ladi)
  const statsQuery = useQuery({
    queryKey: queryKeys.purchases.stats(),
    queryFn: () => purchasesApi.getStats(),
  });
  const suggestedRate = statsQuery.data?.lastUsdRate;

  useEffect(() => {
    if (suggestedRate && !rateTouched.current && exchangeRate === 0) {
      setExchangeRate(suggestedRate);
    }
  }, [suggestedRate, exchangeRate]);

  // Qidiruv maydoni bo'shatilganda ro'yxat DARHOL yopilishi kerak —
  // kechiktirilgan qiymatni kutib turish dropdown'ni osilib qoldirardi.
  const productResults = productSearch.trim() ? productQuery.data?.content ?? [] : [];

  const isForeign = currency !== 'UZS';
  const rateMissing = isForeign && exchangeRate <= 0;

  const totals = useMemo(
    () =>
      computePurchasePricing(
        currency,
        exchangeRate,
        transportCost,
        items.map((item) => ({
          key: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          bonusPerUnit: item.bonusPerUnit,
          bonusPercent: item.bonusPercent,
        }))
      ),
    [currency, exchangeRate, transportCost, items]
  );

  // Input'dagi min/max faqat brauzer strelkalarini cheklaydi, terilgan
  // qiymatni emas — jami summadan ortiq (yoki manfiy) to'lov shu yerda
  // kesiladi; backend ham ortiqcha to'lovni 400 bilan rad etadi.
  const paidUzs = toUzs(paidAmount, currency, exchangeRate);
  const safePaidUzs = Math.min(Math.max(0, paidUzs), Math.max(0, totals.totalAmount));
  const debtUzs = Math.max(0, totals.totalAmount - safePaidUzs);

  /** Hujjat valyutasidagi summa: USD → `$692`, UZS → `692 so'm`. */
  const fmtDoc = (value: number) => (isForeign ? formatForeign(value, currency) : formatCurrency(value));

  const save = useMutation({
    mutationFn: (request: PurchaseRequest) => purchasesApi.create(request),
    onSuccess: (_, request) => {
      toast.success(
        request.receiveNow === false
          ? t('erp.purchases.created')
          : t('erp.purchases.createdReceived')
      );
      // Zaxira, mahsulot tannarxi, ta'minotchi balansi va statistika — to'liq
      // ro'yxat `lib/invalidation.ts` da, ikkala sahifa uchun bir xil.
      invalidateAfter.purchase(queryClient);
      onClose();
    },
    onError: (error) => {
      console.error('Failed to save purchase:', error);
      toast.error(getApiErrorMessage(error));
    },
  });

  const saving = save.isPending;

  const handleAdd = (product: Product) => {
    // Taxmin narx so'mda; USD hujjatda kurs bo'yicha dollarga aylantiriladi
    const guessUzs = initialUnitPrice(product);
    const price = isForeign && exchangeRate > 0 ? round2(guessUzs / exchangeRate) : guessUzs;
    setItems((prev) => addToCart(prev, product, price));
    setProductSearch('');
  };

  const handleItemChange = (productId: number, field: CartItemField, value: number) => {
    setItems((prev) => updateCartItem(prev, productId, field, value));
  };

  /**
   * Valyuta almashganda kiritilgan narxlar shu kurs bilan qayta hisoblanadi —
   * aks holda "46,25" dollar bir bosishda "46,25 so'm" bo'lib qolardi.
   */
  const handleCurrencyChange = (next: PurchaseCurrency) => {
    if (next === currency) return;
    if (exchangeRate > 0) {
      const factor = next === 'UZS' ? exchangeRate : 1 / exchangeRate;
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          unitPrice: roundForCurrency(item.unitPrice * factor, next),
          bonusPerUnit: roundForCurrency(item.bonusPerUnit * factor, next),
        }))
      );
      setPaidAmount((prev) => roundForCurrency(prev * factor, next));
    }
    setCurrency(next);
  };

  const handleSave = () => {
    if (!supplierId || items.length === 0) return;
    if (rateMissing) {
      toast.error(t('erp.purchases.exchangeRate'));
      return;
    }

    save.mutate({
      supplierId: Number(supplierId),
      orderDate,
      paidAmount: safePaidUzs,
      notes: notes.trim() || undefined,
      items: items.map<PurchaseItemRequest>((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        bonusPerUnit: item.bonusPerUnit,
        bonusPercent: item.bonusPercent,
      })),
      currency,
      exchangeRate: isForeign ? exchangeRate : undefined,
      supplierDocNumber: supplierDocNumber.trim() || undefined,
      supplierDocDate: supplierDocDate || undefined,
      vehicleNumber: vehicleNumber.trim() || undefined,
      transportCost: transportCost > 0 ? transportCost : undefined,
      receiveNow,
    });
  };

  const labelClass =
    'label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50';
  const numberInputClass = 'input input-bordered input-sm w-full text-right tabular-nums';

  return (
    <div className="w-full max-w-5xl bg-base-100 rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t('erp.purchases.docTitle')}
            </h3>
            <p className="text-sm text-base-content/60">{t('erp.purchases.docSubtitle')}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('common.cancel')}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-6 space-y-5">
          {/* ─── Hujjat ma'lumotlari ─── */}
          <div className="surface-soft rounded-xl p-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4 flex items-center gap-2">
              <Truck className="h-4 w-4" />
              {t('erp.purchases.sectionDocument')}
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Select
                label={t('erp.purchases.supplierRequiredLabel')}
                value={supplierId || ''}
                onChange={(value) => setSupplierId(value ? Number(value) : '')}
                placeholder={t('erp.purchases.supplierSelectPlaceholder')}
                options={suppliers.map((supplier) => ({
                  value: supplier.id,
                  label: supplier.name,
                }))}
              />
              <label className="form-control">
                <span className={labelClass}>{t('erp.purchases.dateRequiredLabel')}</span>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                />
              </label>
              <label className="form-control">
                <span className={labelClass}>{t('erp.purchases.supplierDocNumber')}</span>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={supplierDocNumber}
                  maxLength={50}
                  placeholder={t('erp.purchases.supplierDocNumberPh')}
                  onChange={(e) => setSupplierDocNumber(e.target.value)}
                />
              </label>
              <label className="form-control">
                <span className={labelClass}>{t('erp.purchases.supplierDocDate')}</span>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={supplierDocDate}
                  onChange={(e) => setSupplierDocDate(e.target.value)}
                />
              </label>
              <label className="form-control">
                <span className={labelClass}>{t('erp.purchases.vehicleNumber')}</span>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={vehicleNumber}
                  maxLength={50}
                  placeholder={t('erp.purchases.vehicleNumberPh')}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label={t('erp.purchases.currency')}
                  value={currency}
                  onChange={(value) => handleCurrencyChange((value as PurchaseCurrency) || 'UZS')}
                  options={Object.entries(PURCHASE_CURRENCIES).map(([key, { label }]) => ({
                    value: key,
                    label: `${key} — ${label}`,
                  }))}
                />
                <label className="form-control">
                  <span className={labelClass}>{t('erp.purchases.exchangeRate')}</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={clsx(
                      'input input-bordered w-full tabular-nums',
                      rateMissing && 'input-error'
                    )}
                    value={exchangeRate || ''}
                    disabled={!isForeign}
                    onChange={(e) => {
                      rateTouched.current = true;
                      setExchangeRate(Number(e.target.value) || 0);
                    }}
                    aria-label={t('erp.purchases.exchangeRate')}
                  />
                </label>
              </div>
            </div>
            {isForeign && suggestedRate && exchangeRate === suggestedRate && (
              <p className="mt-2 flex items-center gap-1 text-xs text-base-content/60">
                <Info className="h-3.5 w-3.5" />
                {t('erp.purchases.exchangeRateHint')}
              </p>
            )}
          </div>

          {/* ─── Mahsulotlar ─── */}
          <div className="surface-soft rounded-xl p-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4 flex items-center gap-2">
              <Package className="h-4 w-4" />
              {t('erp.purchases.colItems')}
            </h4>

            <ProductSearchCombobox
              value={productSearch}
              onChange={setProductSearch}
              onSelect={handleAdd}
              products={productResults}
              isLoading={productQuery.isFetching}
              placeholder={t('erp.purchases.productSearchPlaceholder')}
              className="mb-4"
            />

            {items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>{t('erp.purchases.colProduct')}</th>
                      <th className="w-20">{t('erp.purchases.colQuantity')}</th>
                      <th className="w-32">{t('erp.purchases.priceIn', { currency })}</th>
                      <th className="w-28">{t('erp.purchases.colBonusPerUnit')}</th>
                      <th className="w-24">{t('erp.purchases.colBonusPercent')}</th>
                      <th className="w-36 text-right">{t('erp.purchases.colLineTotal')}</th>
                      <th className="w-32 text-right">{t('erp.purchases.colLandedCost')}</th>
                      <th className="w-12"><span className="sr-only">{t('common.actions')}</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const line = totals.lines.find((l) => l.key === item.product.id);
                      return (
                        <tr key={item.product.id}>
                          <td>
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-xs text-base-content/60">
                              {item.product.sku}
                              {item.product.sizeString && ` • ${item.product.sizeString}`}
                            </p>
                          </td>
                          <td>
                            <input
                              type="number"
                              min={1}
                              className={numberInputClass}
                              value={item.quantity}
                              aria-label={t('erp.purchases.colQuantity')}
                              onChange={(e) =>
                                handleItemChange(item.product.id, 'quantity', Math.max(1, Number(e.target.value) || 1))
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              step={isForeign ? 0.01 : 1}
                              className={numberInputClass}
                              value={item.unitPrice}
                              aria-label={t('erp.purchases.priceIn', { currency })}
                              onChange={(e) =>
                                handleItemChange(item.product.id, 'unitPrice', Math.max(0, Number(e.target.value) || 0))
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              step={isForeign ? 0.01 : 1}
                              className={numberInputClass}
                              value={item.bonusPerUnit || ''}
                              placeholder="0"
                              disabled={item.bonusPercent > 0}
                              aria-label={t('erp.purchases.colBonusPerUnit')}
                              onChange={(e) =>
                                handleItemChange(item.product.id, 'bonusPerUnit', Math.max(0, Number(e.target.value) || 0))
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              className={numberInputClass}
                              value={item.bonusPercent || ''}
                              placeholder="0"
                              aria-label={t('erp.purchases.colBonusPercent')}
                              onChange={(e) =>
                                handleItemChange(
                                  item.product.id,
                                  'bonusPercent',
                                  Math.min(100, Math.max(0, Number(e.target.value) || 0))
                                )
                              }
                            />
                          </td>
                          <td className="text-right">
                            <p className="font-semibold tabular-nums">
                              {fmtDoc((line?.foreignLineTotal ?? 0) - (line?.foreignBonus ?? 0))}
                            </p>
                            {isForeign && line && (
                              <p className="text-xs text-base-content/60 tabular-nums">
                                {formatCurrency(line.totalPrice - line.bonusAmount)}
                              </p>
                            )}
                          </td>
                          <td className="text-right text-sm tabular-nums text-base-content/80">
                            {line ? formatCurrency(line.landedUnitCost) : '—'}
                          </td>
                          <td>
                            <Button
                              variant="ghost"
                              size="sm"
                              iconOnly
                              className="text-error"
                              aria-label={t('common.delete')}
                              onClick={() => setItems((prev) => removeFromCart(prev, item.product.id))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-base-content/50">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t('erp.purchases.cartEmpty')}</p>
              </div>
            )}
          </div>

          {/* ─── Yakun ─── */}
          {items.length > 0 && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="surface-soft rounded-xl p-4 space-y-4">
                <label className="form-control">
                  <span className={labelClass}>{t('erp.purchases.transportCost')}</span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    className="input input-bordered w-full tabular-nums"
                    value={transportCost || ''}
                    placeholder="0"
                    onChange={(e) => setTransportCost(Math.max(0, Number(e.target.value) || 0))}
                  />
                  <span className="mt-1 text-xs text-base-content/60">
                    {t('erp.purchases.transportCostHint')}
                  </span>
                </label>

                <label className="form-control">
                  <span className={labelClass}>
                    {isForeign ? t('erp.purchases.paidAmountUsd') : t('erp.purchases.paidAmountUzs')}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={isForeign ? 0.01 : 1000}
                    className="input input-bordered w-full tabular-nums"
                    value={paidAmount || ''}
                    placeholder="0"
                    onChange={(e) => setPaidAmount(Math.max(0, Number(e.target.value) || 0))}
                  />
                  {isForeign && paidAmount > 0 && (
                    <span className="mt-1 text-xs text-base-content/60">
                      {t('erp.purchases.summaryInUzs', { amount: formatCurrency(paidUzs) })}
                    </span>
                  )}
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-base-300 p-3">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary mt-0.5"
                    checked={receiveNow}
                    onChange={(e) => setReceiveNow(e.target.checked)}
                  />
                  <span>
                    <span className="block font-medium">{t('erp.purchases.receiveNow')}</span>
                    {!receiveNow && (
                      <span className="mt-1 block text-xs text-base-content/60">
                        {t('erp.purchases.receiveLater')}
                      </span>
                    )}
                  </span>
                </label>
              </div>

              <div className="surface-soft rounded-xl p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-base-content/70">{t('erp.purchases.summaryTotalItems')}</span>
                    <span className="font-medium">
                      {t('erp.purchases.unitsCount', { count: totals.totalQuantity })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/70">{t('erp.purchases.summaryGoods')}</span>
                    <span className="text-right tabular-nums">
                      <span className="font-medium">{fmtDoc(totals.foreignGoods)}</span>
                      {isForeign && (
                        <span className="block text-xs text-base-content/60">
                          {formatCurrency(totals.goodsAmount)}
                        </span>
                      )}
                    </span>
                  </div>
                  {totals.bonusAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-base-content/70">{t('erp.purchases.summaryBonus')}</span>
                      <span className="text-right tabular-nums text-success">
                        <span className="font-medium">−{fmtDoc(totals.foreignBonus)}</span>
                        {isForeign && (
                          <span className="block text-xs text-base-content/60">
                            −{formatCurrency(totals.bonusAmount)}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  <div className="divider my-1"></div>
                  <div className="flex justify-between text-lg font-semibold">
                    <span>{t('erp.purchases.summaryPayable')}</span>
                    <span className="text-right tabular-nums">
                      <span>{fmtDoc(totals.foreignTotalAmount)}</span>
                      {isForeign && (
                        <span className="block text-sm font-medium text-base-content/70">
                          {formatCurrency(totals.totalAmount)}
                        </span>
                      )}
                    </span>
                  </div>
                  {transportCost > 0 && (
                    <div className="flex justify-between text-xs text-base-content/60">
                      <span>{t('erp.purchases.transportCost')}</span>
                      <span className="tabular-nums">{formatCurrency(transportCost)}</span>
                    </div>
                  )}
                  <div className="divider my-1"></div>
                  <div className="flex justify-between">
                    <span className="text-base-content/70">{t('erp.purchases.paidLabel')}</span>
                    <span className="font-medium tabular-nums text-success">
                      {formatCurrency(safePaidUzs)}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="text-base-content/70">{t('erp.purchases.colDebt')}:</span>
                    <span
                      className={clsx(
                        'font-semibold tabular-nums',
                        debtUzs > 0 ? 'text-error' : 'text-success'
                      )}
                    >
                      {formatCurrency(debtUzs)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <label className="form-control">
            <span className={labelClass}>{t('erp.purchases.notesLabel')}</span>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={2}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('erp.purchases.notesPlaceholder')}
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
            loading={saving}
            disabled={saving || !supplierId || items.length === 0 || rateMissing}
          >
            {receiveNow ? t('erp.purchases.saveAndReceive') : t('erp.purchases.saveDocument')}
          </Button>
        </div>
      </div>
    </div>
  );
}

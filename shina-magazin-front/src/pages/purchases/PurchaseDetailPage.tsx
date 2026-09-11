import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../../utils/apiError';
import { queryKeys } from '../../lib/queryKeys';
import { invalidateAfter } from '../../lib/invalidation';
import { useInvalidateOnNotification } from '../../hooks/useInvalidateOnNotification';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Ban,
  Calendar,
  ClipboardCheck,
  Coins,
  FileText,
  Package,
  Hash,
  Wallet,
  CreditCard,
  RotateCcw,
  Plus,
  Check,
  AlertCircle,
  Printer,
  Trash2,
  Truck,
  CheckCircle,
  XCircle,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { purchasesApi } from '../../api/purchases.api';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatForeign,
  getTashkentToday,
  PURCHASE_STATUSES,
} from '../../config/constants';
import { enumLabel } from '@/shared/enumLabel';
import { ModalPortal } from '../../components/common/Modal';
import { PermissionGate } from '../../components/common/PermissionGate';
import { PermissionCode } from '../../hooks/usePermission';
import { Select } from '../../components/ui/Select';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { Button } from '@/ui';
import { usePurchaseDocument } from '../../components/purchases/usePurchaseDocument';
import type {
  PurchasePaymentRequest,
  PurchaseReturnRequest,
  PurchaseReturnItemRequest,
  PaymentMethod,
  Product,
} from '../../types';

type TabType = 'items' | 'payments' | 'returns';

interface ReturnCartItem {
  product: Product;
  productId: number;
  maxQuantity: number;
  quantity: number;
  unitPrice: number;
}

export function PurchaseDetailPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Main data
  const [activeTab, setActiveTab] = useState<TabType>('items');

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(getTashkentToday());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentSaving, setPaymentSaving] = useState(false);

  // Return modal
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnDate, setReturnDate] = useState(getTashkentToday());
  const [returnReason, setReturnReason] = useState('');
  const [returnItems, setReturnItems] = useState<ReturnCartItem[]>([]);
  const [returnSaving, setReturnSaving] = useState(false);

  // Qabul qilish ("TEKSHIRILDI") oynasi — qator bo'yicha JAMI qabul qilingan miqdor
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveQty, setReceiveQty] = useState<Record<number, number>>({});
  const [receiveNotes, setReceiveNotes] = useState('');
  const [receiveSaving, setReceiveSaving] = useState(false);

  const { printDocument, document: printableDocument } = usePurchaseDocument();

  const purchaseQuery = useQuery({
    queryKey: queryKeys.purchases.detail(Number(id)),
    queryFn: () => purchasesApi.getById(Number(id)),
    enabled: !!id,
  });

  const paymentsQuery = useQuery({
    queryKey: queryKeys.purchases.payments(Number(id)),
    queryFn: () => purchasesApi.getPayments(Number(id)),
    enabled: !!id,
  });

  const returnsQuery = useQuery({
    queryKey: queryKeys.purchases.returns(Number(id)),
    queryFn: () => purchasesApi.getReturns(Number(id)),
    enabled: !!id,
  });

  const purchase = purchaseQuery.data ?? null;
  const payments = useMemo(() => paymentsQuery.data ?? [], [paymentsQuery.data]);
  const returns = useMemo(() => returnsQuery.data ?? [], [returnsQuery.data]);
  // `enabled: !!id` bo'lganda so'rov ishga tushmaydi va `isPending`
  // ABADIY true qoladi — skeletni faqat shunga bog'lash sahifani
  // cheksiz yuklanayotgan holatda qoldirardi.
  const initialLoading = !!id && purchaseQuery.isPending;
  const refreshing = purchaseQuery.isFetching && !purchaseQuery.isPending;

  /**
   * Xaridning har qanday o'zgarishi (to'lov, qaytarish) uchtala so'rovga ham
   * tegadi: to'lov qarzni, qaytarish esa zaxira va summani o'zgartiradi.
   * Prefiks bo'yicha bekor qilish ularni birga yangilaydi.
   */
  const invalidatePurchase = () => {
    invalidateAfter.purchase(queryClient);
  };

  useInvalidateOnNotification([queryKeys.purchases.all]);

  // Payment modal handlers
  const handleOpenPaymentModal = () => {
    setPaymentAmount(purchase?.debtAmount || 0);
    setPaymentDate(getTashkentToday());
    setPaymentMethod('CASH');
    setPaymentReference('');
    setPaymentNotes('');
    setShowPaymentModal(true);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentAmount(0);
    setPaymentReference('');
    setPaymentNotes('');
  };

  const handleSavePayment = async () => {
    if (!id || paymentAmount <= 0) return;

    setPaymentSaving(true);
    try {
      const request: PurchasePaymentRequest = {
        amount: paymentAmount,
        paymentDate,
        paymentMethod,
        referenceNumber: paymentReference || undefined,
        notes: paymentNotes || undefined,
      };

      await purchasesApi.addPayment(Number(id), request);
      handleClosePaymentModal();
      invalidatePurchase();
    } catch (error) {
      console.error('Failed to save payment:', error);
    } finally {
      setPaymentSaving(false);
    }
  };

  // Return modal handlers
  const handleOpenReturnModal = () => {
    if (!purchase) return;

    // Initialize return items from purchase items
    const items: ReturnCartItem[] = purchase.items.map(item => ({
      product: { id: item.productId, name: item.productName, sku: item.productSku } as Product,
      productId: item.productId,
      // Qaytarish kvotasi QABUL QILINGAN miqdordan — kam kelgan mol qaytarilmaydi
      maxQuantity: item.receivedQuantity ?? item.quantity,
      quantity: 0,
      unitPrice: item.unitPrice,
    }));

    setReturnItems(items);
    setReturnDate(getTashkentToday());
    setReturnReason('');
    setShowReturnModal(true);
  };

  const handleCloseReturnModal = () => {
    setShowReturnModal(false);
    setReturnItems([]);
    setReturnReason('');
  };

  const handleUpdateReturnQuantity = (productId: number, quantity: number) => {
    setReturnItems(prev => prev.map(item =>
      item.productId === productId
        ? { ...item, quantity: Math.min(Math.max(0, quantity), item.maxQuantity) }
        : item
    ));
  };

  const handleSaveReturn = async () => {
    if (!id || !returnReason.trim()) return;

    const selectedItems = returnItems.filter(item => item.quantity > 0);
    if (selectedItems.length === 0) return;

    setReturnSaving(true);
    try {
      const items: PurchaseReturnItemRequest[] = selectedItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
      }));

      const request: PurchaseReturnRequest = {
        returnDate,
        reason: returnReason,
        items,
      };

      await purchasesApi.createReturn(Number(id), request);
      handleCloseReturnModal();
      invalidatePurchase();
    } catch (error) {
      console.error('Failed to save return:', error);
      toast.error(getApiErrorMessage(error));
    } finally {
      setReturnSaving(false);
    }
  };

  // Approve return
  const handleApproveReturn = async (returnId: number) => {
    try {
      await purchasesApi.approveReturn(returnId);
      invalidatePurchase();
    } catch (error) {
      console.error('Failed to approve return:', error);
      toast.error(getApiErrorMessage(error));
    }
  };

  // Complete return
  const handleCompleteReturn = async (returnId: number) => {
    try {
      await purchasesApi.completeReturn(returnId);
      invalidatePurchase();
    } catch (error) {
      console.error('Failed to complete return:', error);
      toast.error(getApiErrorMessage(error));
    }
  };

  // Reject return — APPROVED holatidan chiqishning yagona yo'li.
  // O'chirish faqat PENDING uchun ishlaydi, yakunlash esa zaxira yetmasa
  // xato beradi: rad etishsiz bunday qaytarish mahsulotning qaytarish
  // kvotasini band qilib turardi.
  const handleRejectReturn = async (returnId: number) => {
    const reason = prompt(t('erp.purchaseDetail.rejectReturnPrompt'));
    if (reason === null) return;
    try {
      await purchasesApi.rejectReturn(returnId, reason.trim() || undefined);
      invalidatePurchase();
    } catch (error) {
      console.error('Failed to reject return:', error);
      toast.error(getApiErrorMessage(error));
    }
  };

  // Delete return
  const handleDeleteReturn = async (returnId: number) => {
    if (!confirm(t('erp.purchaseDetail.deleteReturnConfirm'))) return;
    try {
      await purchasesApi.deleteReturn(returnId);
      invalidatePurchase();
    } catch (error) {
      console.error('Failed to delete return:', error);
      toast.error(getApiErrorMessage(error));
    }
  };

  const returnTotal = returnItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const selectedReturnItemsCount = returnItems.filter(item => item.quantity > 0).length;

  // ─── Qabul qilish ───
  const awaitingReceipt = purchase?.status === 'ORDERED' || purchase?.status === 'PARTIAL';
  const counted = purchase?.status === 'RECEIVED' || purchase?.status === 'PARTIAL';
  const isForeign = !!purchase?.currency && purchase.currency !== 'UZS';
  const docCurrency = purchase?.currency ?? 'UZS';
  /** Hujjat valyutasidagi summa: USD → `$692`, UZS → so'm. */
  const fmtDoc = (value: number) => (isForeign ? formatForeign(value, docCurrency) : formatCurrency(value));

  const handleOpenReceiveModal = () => {
    if (!purchase) return;
    // Standart: hamma qator to'liq keldi — omborchi faqat farqni tuzatadi
    setReceiveQty(Object.fromEntries(purchase.items.map((item) => [item.id, item.orderedQuantity])));
    setReceiveNotes('');
    setShowReceiveModal(true);
  };

  const receiveTotal = purchase
    ? purchase.items.reduce((sum, item) => sum + (receiveQty[item.id] ?? 0), 0)
    : 0;
  const receiveShortage = purchase
    ? purchase.items.reduce((sum, item) => sum + Math.max(0, item.orderedQuantity - (receiveQty[item.id] ?? 0)), 0)
    : 0;

  const handleReceive = async () => {
    if (!purchase) return;
    if (receiveTotal === 0) {
      toast.error(t('erp.purchaseDetail.receiveNothing'));
      return;
    }
    setReceiveSaving(true);
    try {
      await purchasesApi.receive(purchase.id, {
        items: purchase.items.map((item) => ({
          itemId: item.id,
          receivedQuantity: receiveQty[item.id] ?? item.receivedQuantity,
        })),
        notes: receiveNotes.trim() || undefined,
      });
      toast.success(t('erp.purchaseDetail.received'));
      setShowReceiveModal(false);
      // Zaxira, tannarx va ta'minotchi balansi o'zgardi
      invalidatePurchase();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setReceiveSaving(false);
    }
  };

  const handleCancelPurchase = async () => {
    if (!purchase) return;
    const reason = prompt(t('erp.purchaseDetail.cancelPrompt'));
    if (reason === null) return;
    try {
      await purchasesApi.cancel(purchase.id, reason.trim() || undefined);
      toast.success(t('erp.purchaseDetail.cancelled'));
      invalidatePurchase();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-32 w-full" />
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-error mb-4" />
        <h2 className="text-xl font-semibold">{t('erp.purchaseDetail.notFound')}</h2>
        <Button variant="primary" className="mt-4" onClick={() => navigate('/admin/purchases')}>
          {t('erp.purchaseDetail.goBack')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {refreshing && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-base-100/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <span className="text-sm font-medium text-base-content/70">{t('erp.purchaseDetail.refreshing')}</span>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/purchases')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="section-title flex items-center gap-2">
              <Hash className="h-6 w-6" />
              {purchase.orderNumber}
            </h1>
            <p className="section-subtitle">{purchase.supplierName}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={clsx('badge', PURCHASE_STATUSES[purchase.status]?.color ?? 'badge-ghost')}>
            {enumLabel('purchaseStatus', purchase.status)}
          </span>
          <span className={clsx(
            'badge',
            purchase.paymentStatus === 'PAID' && 'badge-success',
            purchase.paymentStatus === 'PARTIAL' && 'badge-warning',
            purchase.paymentStatus === 'UNPAID' && 'badge-error'
          )}>
            {purchase.paymentStatus === 'PAID' && t('erp.purchaseDetail.paymentStatusPaid')}
            {purchase.paymentStatus === 'PARTIAL' && t('erp.purchaseDetail.paymentStatusPartial')}
            {purchase.paymentStatus === 'UNPAID' && t('erp.purchaseDetail.paymentStatusUnpaid')}
          </span>
          {/* "TEKSHIRILDI" muhri — ta'minotchi hujjatidagi muhr bilan bir xil ma'no */}
          {counted && purchase.receivedAt ? (
            <span
              className="inline-flex flex-col items-center rounded-md border-2 border-double border-success px-3 py-1 text-success -rotate-3"
              title={t('erp.purchaseDetail.verifiedBy', {
                name: purchase.receivedByName ?? '',
                date: formatDateTime(purchase.receivedAt),
              })}
            >
              <span className="text-xs font-extrabold tracking-[0.2em]">{t('erp.purchaseDetail.verifiedStamp')}</span>
              <span className="text-[10px] font-medium">
                {purchase.receivedByName} · {formatDate(purchase.receivedAt)}
              </span>
            </span>
          ) : awaitingReceipt ? (
            <span className="badge badge-outline badge-info gap-1">
              <ClipboardCheck className="h-3.5 w-3.5" />
              {t('erp.purchaseDetail.awaitingStamp')}
            </span>
          ) : null}
        </div>
      </div>

      {awaitingReceipt && (
        <div className="alert alert-info">
          <ClipboardCheck className="h-5 w-5" />
          <span>{t('erp.purchaseDetail.notReceivedHint')}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">{t('erp.purchaseDetail.date')}</p>
              <p className="font-semibold">{formatDate(purchase.orderDate)}</p>
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-info/10 p-2.5">
              <Package className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">{t('erp.purchaseDetail.products')}</p>
              <p className="font-semibold">{t('erp.purchaseDetail.productsSummary', { itemCount: purchase.itemCount, totalQuantity: purchase.totalQuantity })}</p>
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2.5">
              <CreditCard className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">{t('erp.purchaseDetail.totalAmount')}</p>
              <p className="font-semibold">{formatCurrency(purchase.totalAmount)}</p>
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-error/10 p-2.5">
              <Wallet className="h-5 w-5 text-error" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">{t('erp.purchaseDetail.debt')}</p>
              <p className={clsx(
                'font-semibold',
                purchase.debtAmount > 0 ? 'text-error' : 'text-success'
              )}>
                {purchase.debtAmount > 0 ? formatCurrency(purchase.debtAmount) : t('erp.purchaseDetail.paymentStatusPaid')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ta'minotchi hujjati: Kun ID, mashina, valyuta/kurs, yo'l haqi */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="surface-card p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-base-200 p-2.5">
              <FileText className="h-5 w-5 text-base-content/70" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-base-content/60">{t('erp.purchaseDetail.docInfo')}</p>
              <p className="font-semibold">
                {purchase.supplierDocNumber
                  ? `${t('erp.purchaseDetail.docNumber')} ${purchase.supplierDocNumber}`
                  : '—'}
              </p>
              {purchase.supplierDocDate && (
                <p className="text-xs text-base-content/60">
                  {t('erp.purchaseDetail.docDate')}: {formatDate(purchase.supplierDocDate)}
                </p>
              )}
              {purchase.vehicleNumber && (
                <p className="mt-1 flex items-center gap-1 text-xs text-base-content/70">
                  <Truck className="h-3.5 w-3.5" />
                  {purchase.vehicleNumber}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-secondary/10 p-2.5">
              <Coins className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">{t('erp.purchaseDetail.currencyInfo')}</p>
              {isForeign ? (
                <>
                  <p className="font-semibold">
                    {purchase.foreignTotalAmount != null && fmtDoc(purchase.foreignTotalAmount)}
                  </p>
                  <p className="text-xs text-base-content/60">
                    {t('erp.purchaseDetail.rate')}: 1 {docCurrency} = {formatCurrency(purchase.exchangeRate)}
                  </p>
                </>
              ) : (
                <p className="font-semibold">{enumLabel('currency', 'UZS')}</p>
              )}
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-warning/10 p-2.5">
              <Truck className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">{t('erp.purchaseDetail.transportCost')}</p>
              <p className="font-semibold">
                {purchase.transportCost > 0 ? formatCurrency(purchase.transportCost) : '—'}
              </p>
              {purchase.transportCost > 0 && (
                <p className="text-xs text-base-content/60">{t('erp.purchaseDetail.transportCostHint')}</p>
              )}
              {purchase.bonusAmount > 0 && (
                <p className="mt-1 text-xs text-success">
                  {t('erp.purchaseDetail.bonus')}: −{formatCurrency(purchase.bonusAmount)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {awaitingReceipt && (
          <PermissionGate permission={PermissionCode.PURCHASES_RECEIVE}>
            <Button variant="primary" size="sm" onClick={handleOpenReceiveModal}>
              <ClipboardCheck className="h-4 w-4" />
              {t('erp.purchaseDetail.receive')}
            </Button>
          </PermissionGate>
        )}
        {purchase.debtAmount > 0 && (
          <Button variant={awaitingReceipt ? 'secondary' : 'primary'} size="sm" onClick={handleOpenPaymentModal}>
            <Plus className="h-4 w-4" />
            {t('erp.purchaseDetail.addPayment')}
          </Button>
        )}
        {counted && (
          <Button variant="secondary" size="sm" onClick={handleOpenReturnModal}>
            <RotateCcw className="h-4 w-4" />
            {t('erp.purchaseDetail.createReturn')}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => printDocument(purchase)}>
          <Printer className="h-4 w-4" />
          {t('erp.purchaseDetail.printDoc')}
        </Button>
        {(purchase.status === 'ORDERED' || purchase.status === 'DRAFT') && (
          <PermissionGate permission={PermissionCode.PURCHASES_UPDATE}>
            <Button variant="ghost" size="sm" className="text-error" onClick={handleCancelPurchase}>
              <Ban className="h-4 w-4" />
              {t('erp.purchaseDetail.cancelPurchase')}
            </Button>
          </PermissionGate>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-base-200 p-1 w-fit">
        <button
          className={clsx('tab', activeTab === 'items' && 'tab-active')}
          onClick={() => setActiveTab('items')}
        >
          <Package className="h-4 w-4 mr-2" />
          {t('erp.purchaseDetail.tabProducts', { count: purchase.itemCount })}
        </button>
        <button
          className={clsx('tab', activeTab === 'payments' && 'tab-active')}
          onClick={() => setActiveTab('payments')}
        >
          <CreditCard className="h-4 w-4 mr-2" />
          {t('erp.purchaseDetail.tabPayments', { count: purchase.paymentCount })}
        </button>
        <button
          className={clsx('tab', activeTab === 'returns' && 'tab-active')}
          onClick={() => setActiveTab('returns')}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          {t('erp.purchaseDetail.tabReturns', { count: purchase.returnCount })}
        </button>
      </div>

      {/* Tab Content */}
      <div className="surface-card">
        {/* Items Tab */}
        {activeTab === 'items' && (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('erp.purchaseDetail.colProduct')}</th>
                  <th className="text-right">{t('erp.purchaseDetail.colOrderedQty')}</th>
                  <th className="text-right">{t('erp.purchaseDetail.colReceivedQty')}</th>
                  <th className="text-right">{t('erp.purchaseDetail.colPrice')}</th>
                  <th className="text-right">{t('erp.purchaseDetail.colBonus')}</th>
                  <th className="text-right">{t('erp.purchaseDetail.colAmount')}</th>
                  <th className="text-right">{t('erp.purchaseDetail.colLanded')}</th>
                </tr>
              </thead>
              <tbody>
                {purchase.items.map((item, index) => {
                  const ordered = item.orderedQuantity ?? item.quantity;
                  const shortage = counted ? Math.max(0, ordered - item.receivedQuantity) : 0;
                  return (
                    <tr key={item.id} className={clsx(shortage > 0 && 'bg-warning/5')}>
                      <td className="text-base-content/60">{index + 1}</td>
                      <td>
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-xs text-base-content/60">
                            {item.productSku}
                            {item.sizeString && ` • ${item.sizeString}`}
                          </p>
                        </div>
                      </td>
                      <td className="text-right tabular-nums">{t('erp.purchaseDetail.quantityUnit', { count: ordered })}</td>
                      <td className="text-right tabular-nums">
                        {counted ? (
                          <span className={clsx(shortage > 0 ? 'font-semibold text-warning' : 'text-success')}>
                            {t('erp.purchaseDetail.quantityUnit', { count: item.receivedQuantity })}
                            {shortage > 0 && (
                              <span className="ml-1 badge badge-warning badge-xs badge-outline">−{shortage}</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-base-content/40">—</span>
                        )}
                      </td>
                      <td className="text-right tabular-nums">
                        {isForeign && item.foreignUnitPrice != null ? (
                          <>
                            <span>{fmtDoc(item.foreignUnitPrice)}</span>
                            <p className="text-xs text-base-content/60">{formatCurrency(item.unitPrice)}</p>
                          </>
                        ) : (
                          formatCurrency(item.unitPrice)
                        )}
                      </td>
                      <td className="text-right tabular-nums">
                        {item.bonusAmount > 0 ? (
                          <span className="text-success">
                            −{formatCurrency(item.bonusAmount)}
                            {item.bonusPercent > 0 && (
                              <span className="ml-1 text-xs text-base-content/60">({item.bonusPercent}%)</span>
                            )}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="text-right font-semibold tabular-nums">
                        {formatCurrency(item.totalPrice - item.bonusAmount)}
                      </td>
                      <td className="text-right tabular-nums text-base-content/80">
                        {formatCurrency(item.landedUnitCost ?? item.unitPrice)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                {purchase.bonusAmount > 0 && (
                  <>
                    <tr>
                      <td colSpan={6} className="text-right text-base-content/70">{t('erp.purchaseDetail.totalsGoods')}</td>
                      <td className="text-right tabular-nums">{formatCurrency(purchase.goodsAmount)}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={6} className="text-right text-base-content/70">{t('erp.purchaseDetail.totalsBonus')}</td>
                      <td className="text-right tabular-nums text-success">−{formatCurrency(purchase.bonusAmount)}</td>
                      <td></td>
                    </tr>
                  </>
                )}
                <tr>
                  <td colSpan={6} className="text-right font-semibold">{t('erp.purchaseDetail.totalsPayable')}</td>
                  <td className="text-right font-bold text-lg tabular-nums">
                    {formatCurrency(purchase.totalAmount)}
                    {isForeign && purchase.foreignTotalAmount != null && (
                      <span className="block text-sm font-medium text-base-content/60">
                        {fmtDoc(purchase.foreignTotalAmount)}
                      </span>
                    )}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div>
            {payments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t('erp.purchaseDetail.colDate')}</th>
                      <th>{t('erp.purchaseDetail.colAmount')}</th>
                      <th>{t('erp.purchaseDetail.colMethod')}</th>
                      <th>{t('erp.purchaseDetail.colReference')}</th>
                      <th>{t('erp.purchaseDetail.colNotes')}</th>
                      <th>{t('erp.purchaseDetail.colReceivedBy')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatDate(payment.paymentDate)}</td>
                        <td className="font-semibold text-success">{formatCurrency(payment.amount)}</td>
                        <td>
                          <span className="badge badge-sm badge-ghost">
                            {payment.paymentMethod === 'CASH' && t('erp.purchaseDetail.methodCash')}
                            {payment.paymentMethod === 'CARD' && t('erp.purchaseDetail.methodCard')}
                            {payment.paymentMethod === 'TRANSFER' && t('erp.purchaseDetail.methodTransfer')}
                          </span>
                        </td>
                        <td className="text-base-content/60">{payment.referenceNumber || '—'}</td>
                        <td className="text-base-content/60 max-w-xs truncate">{payment.notes || '—'}</td>
                        <td className="text-base-content/60">{payment.receivedByName}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="font-semibold">{t('erp.purchaseDetail.totalPaidLabel')}</td>
                      <td className="font-bold text-success">{formatCurrency(purchase.paidAmount)}</td>
                      <td colSpan={4}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-base-content/50">
                <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t('erp.purchaseDetail.noPayments')}</p>
                {purchase.debtAmount > 0 && (
                  <Button variant="primary" size="sm" className="mt-4" onClick={handleOpenPaymentModal}>
                    <Plus className="h-4 w-4" />
                    {t('erp.purchaseDetail.addPayment')}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Returns Tab */}
        {activeTab === 'returns' && (
          <div>
            {returns.length > 0 ? (
              <div className="space-y-4 p-4">
                {returns.map((returnItem) => (
                  <div key={returnItem.id} className="surface-soft rounded-xl p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-mono font-semibold">{returnItem.returnNumber}</span>
                          <span className={clsx(
                            'badge badge-sm',
                            returnItem.status === 'PENDING' && 'badge-warning',
                            returnItem.status === 'APPROVED' && 'badge-info',
                            returnItem.status === 'COMPLETED' && 'badge-success',
                            returnItem.status === 'REJECTED' && 'badge-error'
                          )}>
                            {returnItem.status === 'PENDING' && t('erp.purchaseDetail.returnStatusPending')}
                            {returnItem.status === 'APPROVED' && t('erp.purchaseDetail.returnStatusApproved')}
                            {returnItem.status === 'COMPLETED' && t('erp.purchaseDetail.returnStatusCompleted')}
                            {returnItem.status === 'REJECTED' && t('erp.purchaseDetail.returnStatusRejected')}
                          </span>
                        </div>
                        <p className="text-sm text-base-content/70">
                          <Calendar className="h-4 w-4 inline mr-1" />
                          {formatDate(returnItem.returnDate)}
                        </p>
                        <p className="text-sm text-base-content/70 mt-1">
                          {t('erp.purchaseDetail.reasonLabel')} {returnItem.reason}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-error">{formatCurrency(returnItem.refundAmount)}</p>
                        <p className="text-xs text-base-content/60">
                          {t('erp.purchaseDetail.itemsCount', { count: returnItem.items.length })}
                        </p>
                      </div>
                    </div>

                    {/* Return items */}
                    <div className="mt-4 overflow-x-auto">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>{t('erp.purchaseDetail.colProduct')}</th>
                            <th className="text-right">{t('erp.purchaseDetail.colQuantity')}</th>
                            <th className="text-right">{t('erp.purchaseDetail.colPrice')}</th>
                            <th className="text-right">{t('erp.purchaseDetail.colAmount')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {returnItem.items.map((item) => (
                            <tr key={item.id}>
                              <td>
                                <div>
                                  <p className="font-medium">{item.productName}</p>
                                  <p className="text-xs text-base-content/60">{item.productSku}</p>
                                </div>
                              </td>
                              <td className="text-right">{t('erp.purchaseDetail.quantityUnit', { count: item.returnedQuantity })}</td>
                              <td className="text-right">{formatCurrency(item.unitPrice)}</td>
                              <td className="text-right font-semibold">{formatCurrency(item.totalPrice)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 flex justify-end gap-2">
                      {returnItem.status === 'PENDING' && (
                        <>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleApproveReturn(returnItem.id)}
                          >
                            <Check className="h-4 w-4" />
                            {t('erp.purchaseDetail.approve')}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteReturn(returnItem.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            {t('common.delete')}
                          </Button>
                        </>
                      )}
                      {returnItem.status === 'APPROVED' && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleCompleteReturn(returnItem.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                            {t('erp.purchaseDetail.complete')}
                          </Button>
                          {/* Yakunlash zaxira yetmasa xato beradi (mol sotilgan
                              bo'lishi mumkin), o'chirish esa faqat PENDING uchun —
                              rad etishsiz bunday qaytarish kvotani band qilib
                              turaverardi */}
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRejectReturn(returnItem.id)}
                          >
                            <XCircle className="h-4 w-4" />
                            {t('erp.purchaseDetail.rejectReturn')}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-base-content/50">
                <RotateCcw className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t('erp.purchaseDetail.noReturns')}</p>
                <Button variant="secondary" size="sm" className="mt-4" onClick={handleOpenReturnModal}>
                  <Plus className="h-4 w-4" />
                  {t('erp.purchaseDetail.createReturn')}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      {purchase.notes && (
        <div className="surface-card p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-2">
            {t('erp.purchaseDetail.notesLabel')}
          </h3>
          <p className="text-base-content/80">{purchase.notes}</p>
        </div>
      )}

      {/* Payment Modal */}
      <ModalPortal isOpen={showPaymentModal} onClose={handleClosePaymentModal}>
        <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl">
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">{t('erp.purchaseDetail.addPayment')}</h3>
                <p className="text-sm text-base-content/60">
                  {t('erp.purchaseDetail.debtLabel', { amount: formatCurrency(purchase.debtAmount) })}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClosePaymentModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-6 space-y-4">
              <CurrencyInput
                label={t('erp.purchaseDetail.amountRequired')}
                value={paymentAmount}
                onChange={setPaymentAmount}
                min={0}
                max={purchase.debtAmount}
                showQuickButtons
              />

              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  {t('erp.purchaseDetail.dateRequired')}
                </span>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </label>

              <Select
                label={t('erp.purchaseDetail.paymentMethodLabel')}
                required
                value={paymentMethod}
                onChange={(val) => setPaymentMethod(val as PaymentMethod)}
                options={[
                  { value: 'CASH', label: t('erp.purchaseDetail.methodCashFull') },
                  { value: 'CARD', label: t('erp.purchaseDetail.methodCard') },
                  { value: 'TRANSFER', label: t('erp.purchaseDetail.methodTransferFull') },
                ]}
                placeholder={t('erp.purchaseDetail.paymentMethodPlaceholder')}
              />

              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  {t('erp.purchaseDetail.referenceNumberLabel')}
                </span>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder={t('erp.purchaseDetail.referenceNumberPlaceholder')}
                />
              </label>

              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  {t('erp.purchaseDetail.notesLabel')}
                </span>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={2}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder={t('erp.purchaseDetail.notesPlaceholder')}
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={handleClosePaymentModal} disabled={paymentSaving}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleSavePayment}
                disabled={paymentSaving || paymentAmount <= 0}
              >
                {paymentSaving && <span className="loading loading-spinner loading-sm" />}
                {t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Return Modal */}
      <ModalPortal isOpen={showReturnModal} onClose={handleCloseReturnModal}>
        <div className="w-full max-w-2xl bg-base-100 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">{t('erp.purchaseDetail.createReturn')}</h3>
                <p className="text-sm text-base-content/60">
                  {t('erp.purchaseDetail.returnModalSubtitle')}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCloseReturnModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="form-control">
                  <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                    {t('erp.purchaseDetail.returnDateRequired')}
                  </span>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                  />
                </label>

                <label className="form-control">
                  <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                    {t('erp.purchaseDetail.reasonRequired')}
                  </span>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder={t('erp.purchaseDetail.reasonPlaceholder')}
                  />
                </label>
              </div>

              {/* Return items */}
              <div className="surface-soft rounded-xl p-4">
                <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4">
                  {t('erp.purchaseDetail.returnableProducts')}
                </h4>

                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>{t('erp.purchaseDetail.colProduct')}</th>
                        <th className="text-center">{t('erp.purchaseDetail.colAvailable')}</th>
                        <th className="w-28 text-center">{t('erp.purchaseDetail.colReturn')}</th>
                        <th className="text-right">{t('erp.purchaseDetail.colAmount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returnItems.map((item) => (
                        <tr key={item.productId} className={item.quantity > 0 ? 'bg-warning/10' : ''}>
                          <td>
                            <div>
                              <p className="font-medium">{item.product.name}</p>
                              <p className="text-xs text-base-content/60">{item.product.sku}</p>
                            </div>
                          </td>
                          <td className="text-center">{item.maxQuantity}</td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              max={item.maxQuantity}
                              className="input input-bordered input-sm w-full text-center"
                              value={item.quantity}
                              onChange={(e) => handleUpdateReturnQuantity(item.productId, Number(e.target.value) || 0)}
                            />
                          </td>
                          <td className="text-right font-semibold">
                            {item.quantity > 0 ? formatCurrency(item.quantity * item.unitPrice) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selectedReturnItemsCount > 0 && (
                  <div className="mt-4 pt-4 border-t border-base-200">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>{t('erp.purchaseDetail.returnTotalLabel')}</span>
                      <span className="text-error">{formatCurrency(returnTotal)}</span>
                    </div>
                    <p className="text-sm text-base-content/60 mt-1">
                      {t('erp.purchaseDetail.itemsSelected', { count: selectedReturnItemsCount })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={handleCloseReturnModal} disabled={returnSaving}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveReturn}
                disabled={returnSaving || selectedReturnItemsCount === 0 || !returnReason.trim()}
              >
                {returnSaving && <span className="loading loading-spinner loading-sm" />}
                {t('erp.purchaseDetail.createReturnButton')}
              </Button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Qabul qilish ("TEKSHIRILDI") */}
      <ModalPortal isOpen={showReceiveModal} onClose={() => setShowReceiveModal(false)}>
        <div className="w-full max-w-3xl bg-base-100 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  {t('erp.purchaseDetail.receiveTitle')}
                </h3>
                <p className="text-sm text-base-content/60">{t('erp.purchaseDetail.receiveSubtitle')}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setReceiveQty(Object.fromEntries(purchase.items.map((item) => [item.id, item.orderedQuantity])))
                  }
                >
                  {t('erp.purchaseDetail.receiveAll')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowReceiveModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>{t('erp.purchaseDetail.colProduct')}</th>
                    <th className="text-center">{t('erp.purchaseDetail.colOrdered')}</th>
                    <th className="text-center">{t('erp.purchaseDetail.colReceivedBefore')}</th>
                    <th className="w-32 text-center">{t('erp.purchaseDetail.colReceiving')}</th>
                    <th className="text-center">{t('erp.purchaseDetail.colShortage')}</th>
                  </tr>
                </thead>
                <tbody>
                  {purchase.items.map((item) => {
                    const target = receiveQty[item.id] ?? item.receivedQuantity;
                    const shortage = Math.max(0, item.orderedQuantity - target);
                    return (
                      <tr key={item.id} className={clsx(shortage > 0 && 'bg-warning/10')}>
                        <td>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-xs text-base-content/60">{item.productSku}</p>
                        </td>
                        <td className="text-center tabular-nums">{item.orderedQuantity}</td>
                        <td className="text-center tabular-nums text-base-content/60">{item.receivedQuantity}</td>
                        <td>
                          <input
                            type="number"
                            min={item.receivedQuantity}
                            max={item.orderedQuantity}
                            className="input input-bordered input-sm w-full text-center tabular-nums"
                            value={target}
                            aria-label={`${t('erp.purchaseDetail.colReceiving')} — ${item.productName}`}
                            onChange={(e) =>
                              setReceiveQty((prev) => ({
                                ...prev,
                                [item.id]: Math.min(
                                  item.orderedQuantity,
                                  Math.max(item.receivedQuantity, Number(e.target.value) || 0)
                                ),
                              }))
                            }
                          />
                        </td>
                        <td className={clsx('text-center tabular-nums', shortage > 0 ? 'font-semibold text-warning' : 'text-base-content/40')}>
                          {shortage > 0 ? `−${shortage}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <label className="form-control mt-4">
              <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                {t('erp.purchaseDetail.receiveNotes')}
              </span>
              <input
                type="text"
                className="input input-bordered w-full"
                maxLength={300}
                value={receiveNotes}
                onChange={(e) => setReceiveNotes(e.target.value)}
              />
            </label>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-base-200/60 px-4 py-3 text-sm">
              <span>
                {t('erp.purchaseDetail.colReceiving')}: <strong>{receiveTotal}</strong> / {purchase.totalQuantity}
              </span>
              {receiveShortage > 0 && (
                <span className="font-semibold text-warning">
                  {t('erp.purchases.shortageBadge', { count: receiveShortage })}
                </span>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowReceiveModal(false)} disabled={receiveSaving}>
                {t('common.cancel')}
              </Button>
              <Button variant="primary" onClick={handleReceive} loading={receiveSaving} disabled={receiveSaving || receiveTotal === 0}>
                <Check className="h-4 w-4" />
                {t('erp.purchaseDetail.confirmReceive')}
              </Button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Yashirin kirim hujjati — faqat chop etishda ko'rinadi (@media print) */}
      {printableDocument}
    </div>
  );
}

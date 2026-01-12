import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
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
  CheckCircle,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { purchasesApi } from '../../api/purchases.api';
import { formatCurrency, formatDate, getTashkentToday } from '../../config/constants';
import { ModalPortal } from '../../components/common/Modal';
import { useNotificationsStore } from '../../store/notificationsStore';
import type {
  PurchaseOrder,
  PurchasePayment,
  PurchaseReturn,
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notifications } = useNotificationsStore();

  // Main data
  const [purchase, setPurchase] = useState<PurchaseOrder | null>(null);
  const [payments, setPayments] = useState<PurchasePayment[]>([]);
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  // Load purchase details
  const loadPurchase = useCallback(async (isInitial = false) => {
    if (!id) return;
    if (!isInitial) {
      setRefreshing(true);
    }
    try {
      const data = await purchasesApi.getById(Number(id));
      setPurchase(data);
    } catch (error) {
      console.error('Failed to load purchase:', error);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  // Load payments
  const loadPayments = useCallback(async () => {
    if (!id) return;
    try {
      const data = await purchasesApi.getPayments(Number(id));
      setPayments(data);
    } catch (error) {
      console.error('Failed to load payments:', error);
    }
  }, [id]);

  // Load returns
  const loadReturns = useCallback(async () => {
    if (!id) return;
    try {
      const data = await purchasesApi.getReturns(Number(id));
      setReturns(data);
    } catch (error) {
      console.error('Failed to load returns:', error);
    }
  }, [id]);

  // Initial load
  useEffect(() => {
    loadPurchase(true);
    loadPayments();
    loadReturns();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Real-time updates
  useEffect(() => {
    if (notifications.length > 0) {
      loadPurchase();
      loadPayments();
      loadReturns();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.length]);

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
      loadPurchase();
      loadPayments();
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
      maxQuantity: item.quantity,
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
      loadPurchase();
      loadReturns();
    } catch (error) {
      console.error('Failed to save return:', error);
    } finally {
      setReturnSaving(false);
    }
  };

  // Approve return
  const handleApproveReturn = async (returnId: number) => {
    try {
      await purchasesApi.approveReturn(returnId);
      loadReturns();
    } catch (error) {
      console.error('Failed to approve return:', error);
    }
  };

  // Complete return
  const handleCompleteReturn = async (returnId: number) => {
    try {
      await purchasesApi.completeReturn(returnId);
      loadReturns();
      loadPurchase();
    } catch (error) {
      console.error('Failed to complete return:', error);
    }
  };

  // Delete return
  const handleDeleteReturn = async (returnId: number) => {
    if (!confirm("Qaytarishni o'chirishni xohlaysizmi?")) return;
    try {
      await purchasesApi.deleteReturn(returnId);
      loadReturns();
    } catch (error) {
      console.error('Failed to delete return:', error);
    }
  };

  const returnTotal = returnItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const selectedReturnItemsCount = returnItems.filter(item => item.quantity > 0).length;

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
        <h2 className="text-xl font-semibold">Xarid topilmadi</h2>
        <button className="btn btn-primary mt-4" onClick={() => navigate('/purchases')}>
          Orqaga qaytish
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {refreshing && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-base-100/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <span className="text-sm font-medium text-base-content/70">Yangilanmoqda...</span>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/purchases')}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="section-title flex items-center gap-2">
              <Hash className="h-6 w-6" />
              {purchase.orderNumber}
            </h1>
            <p className="section-subtitle">{purchase.supplierName}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={clsx(
            'badge',
            purchase.status === 'RECEIVED' && 'badge-success',
            purchase.status === 'DRAFT' && 'badge-warning',
            purchase.status === 'CANCELLED' && 'badge-error'
          )}>
            {purchase.status === 'RECEIVED' && 'Qabul qilingan'}
            {purchase.status === 'DRAFT' && 'Qoralama'}
            {purchase.status === 'CANCELLED' && 'Bekor qilingan'}
          </span>
          <span className={clsx(
            'badge',
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Sana</p>
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
              <p className="text-xs text-base-content/60">Mahsulotlar</p>
              <p className="font-semibold">{purchase.itemCount} xil, {purchase.totalQuantity} dona</p>
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2.5">
              <CreditCard className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Jami summa</p>
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
              <p className="text-xs text-base-content/60">Qarz</p>
              <p className={clsx(
                'font-semibold',
                purchase.debtAmount > 0 ? 'text-error' : 'text-success'
              )}>
                {purchase.debtAmount > 0 ? formatCurrency(purchase.debtAmount) : "To'langan"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {purchase.debtAmount > 0 && (
          <button className="btn btn-primary btn-sm" onClick={handleOpenPaymentModal}>
            <Plus className="h-4 w-4" />
            To'lov qo'shish
          </button>
        )}
        <button className="btn btn-secondary btn-sm" onClick={handleOpenReturnModal}>
          <RotateCcw className="h-4 w-4" />
          Qaytarish yaratish
        </button>
        <button className="btn btn-ghost btn-sm">
          <Printer className="h-4 w-4" />
          Chop etish
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-base-200 p-1 w-fit">
        <button
          className={clsx('tab', activeTab === 'items' && 'tab-active')}
          onClick={() => setActiveTab('items')}
        >
          <Package className="h-4 w-4 mr-2" />
          Mahsulotlar ({purchase.itemCount})
        </button>
        <button
          className={clsx('tab', activeTab === 'payments' && 'tab-active')}
          onClick={() => setActiveTab('payments')}
        >
          <CreditCard className="h-4 w-4 mr-2" />
          To'lovlar ({purchase.paymentCount})
        </button>
        <button
          className={clsx('tab', activeTab === 'returns' && 'tab-active')}
          onClick={() => setActiveTab('returns')}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Qaytarishlar ({purchase.returnCount})
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
                  <th>Mahsulot</th>
                  <th className="text-right">Miqdor</th>
                  <th className="text-right">Narx</th>
                  <th className="text-right">Summa</th>
                </tr>
              </thead>
              <tbody>
                {purchase.items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="text-base-content/60">{index + 1}</td>
                    <td>
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-xs text-base-content/60">{item.productSku}</p>
                      </div>
                    </td>
                    <td className="text-right">{item.quantity} dona</td>
                    <td className="text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="text-right font-semibold">{formatCurrency(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="text-right font-semibold">Jami:</td>
                  <td className="text-right font-bold text-lg">{formatCurrency(purchase.totalAmount)}</td>
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
                      <th>Sana</th>
                      <th>Summa</th>
                      <th>Usul</th>
                      <th>Referens</th>
                      <th>Izoh</th>
                      <th>Qabul qiluvchi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatDate(payment.paymentDate)}</td>
                        <td className="font-semibold text-success">{formatCurrency(payment.amount)}</td>
                        <td>
                          <span className="badge badge-sm badge-ghost">
                            {payment.paymentMethod === 'CASH' && 'Naqd'}
                            {payment.paymentMethod === 'CARD' && 'Karta'}
                            {payment.paymentMethod === 'TRANSFER' && "O'tkazma"}
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
                      <td className="font-semibold">Jami to'langan:</td>
                      <td className="font-bold text-success">{formatCurrency(purchase.paidAmount)}</td>
                      <td colSpan={4}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-base-content/50">
                <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>To'lovlar mavjud emas</p>
                {purchase.debtAmount > 0 && (
                  <button className="btn btn-primary btn-sm mt-4" onClick={handleOpenPaymentModal}>
                    <Plus className="h-4 w-4" />
                    To'lov qo'shish
                  </button>
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
                            {returnItem.status === 'PENDING' && 'Kutilmoqda'}
                            {returnItem.status === 'APPROVED' && 'Tasdiqlangan'}
                            {returnItem.status === 'COMPLETED' && 'Yakunlangan'}
                            {returnItem.status === 'REJECTED' && 'Rad etilgan'}
                          </span>
                        </div>
                        <p className="text-sm text-base-content/70">
                          <Calendar className="h-4 w-4 inline mr-1" />
                          {formatDate(returnItem.returnDate)}
                        </p>
                        <p className="text-sm text-base-content/70 mt-1">
                          Sabab: {returnItem.reason}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-error">{formatCurrency(returnItem.refundAmount)}</p>
                        <p className="text-xs text-base-content/60">
                          {returnItem.items.length} ta mahsulot
                        </p>
                      </div>
                    </div>

                    {/* Return items */}
                    <div className="mt-4 overflow-x-auto">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Mahsulot</th>
                            <th className="text-right">Miqdor</th>
                            <th className="text-right">Narx</th>
                            <th className="text-right">Summa</th>
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
                              <td className="text-right">{item.returnedQuantity} dona</td>
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
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleApproveReturn(returnItem.id)}
                          >
                            <Check className="h-4 w-4" />
                            Tasdiqlash
                          </button>
                          <button
                            className="btn btn-error btn-sm"
                            onClick={() => handleDeleteReturn(returnItem.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            O'chirish
                          </button>
                        </>
                      )}
                      {returnItem.status === 'APPROVED' && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleCompleteReturn(returnItem.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Yakunlash
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-base-content/50">
                <RotateCcw className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Qaytarishlar mavjud emas</p>
                <button className="btn btn-secondary btn-sm mt-4" onClick={handleOpenReturnModal}>
                  <Plus className="h-4 w-4" />
                  Qaytarish yaratish
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      {purchase.notes && (
        <div className="surface-card p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-2">
            Izoh
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
                <h3 className="text-xl font-semibold">To'lov qo'shish</h3>
                <p className="text-sm text-base-content/60">
                  Qarz: {formatCurrency(purchase.debtAmount)}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleClosePaymentModal}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  Summa *
                </span>
                <input
                  type="number"
                  min={0}
                  max={purchase.debtAmount}
                  className="input input-bordered w-full"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
                />
              </label>

              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  Sana *
                </span>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </label>

              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  To'lov usuli *
                </span>
                <select
                  className="select select-bordered w-full"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                >
                  <option value="CASH">Naqd pul</option>
                  <option value="CARD">Karta</option>
                  <option value="TRANSFER">Bank o'tkazmasi</option>
                </select>
              </label>

              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  Referens raqami
                </span>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Kvitansiya yoki chek raqami"
                />
              </label>

              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  Izoh
                </span>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={2}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Qo'shimcha ma'lumot..."
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={handleClosePaymentModal} disabled={paymentSaving}>
                Bekor qilish
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSavePayment}
                disabled={paymentSaving || paymentAmount <= 0}
              >
                {paymentSaving && <span className="loading loading-spinner loading-sm" />}
                Saqlash
              </button>
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
                <h3 className="text-xl font-semibold">Qaytarish yaratish</h3>
                <p className="text-sm text-base-content/60">
                  Mahsulotlarni ta'minotchiga qaytarish
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleCloseReturnModal}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="form-control">
                  <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                    Qaytarish sanasi *
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
                    Sabab *
                  </span>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="Nuqsonli mahsulot, xato yetkazib berish..."
                  />
                </label>
              </div>

              {/* Return items */}
              <div className="surface-soft rounded-xl p-4">
                <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4">
                  Qaytariladigan mahsulotlar
                </h4>

                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Mahsulot</th>
                        <th className="text-center">Mavjud</th>
                        <th className="w-28 text-center">Qaytarish</th>
                        <th className="text-right">Summa</th>
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
                      <span>Jami qaytarish summasi:</span>
                      <span className="text-error">{formatCurrency(returnTotal)}</span>
                    </div>
                    <p className="text-sm text-base-content/60 mt-1">
                      {selectedReturnItemsCount} ta mahsulot tanlangan
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={handleCloseReturnModal} disabled={returnSaving}>
                Bekor qilish
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveReturn}
                disabled={returnSaving || selectedReturnItemsCount === 0 || !returnReason.trim()}
              >
                {returnSaving && <span className="loading loading-spinner loading-sm" />}
                Qaytarishni yaratish
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}

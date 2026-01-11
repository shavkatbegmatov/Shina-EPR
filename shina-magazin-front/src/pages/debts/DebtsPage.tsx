import { useCallback, useEffect, useState } from 'react';
import {
  Wallet,
  Phone,
  Calendar,
  CheckCircle,
  X,
  CreditCard,
  Banknote,
  Building,
} from 'lucide-react';
import clsx from 'clsx';
import { debtsApi } from '../../api/debts.api';
import { formatCurrency, DEBT_STATUSES, PAYMENT_METHODS } from '../../config/constants';
import { NumberInput } from '../../components/ui/NumberInput';
import type { Debt, DebtStatus, Payment, PaymentMethod } from '../../types';

export function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [statusFilter, setStatusFilter] = useState<DebtStatus | ''>('');
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isFullPayment, setIsFullPayment] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Stats
  const [totalActiveDebt, setTotalActiveDebt] = useState(0);

  const loadDebts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await debtsApi.getAll({
        page,
        size: 20,
        status: statusFilter || undefined,
      });
      setDebts(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (error) {
      console.error('Failed to load debts:', error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  const loadTotalDebt = useCallback(async () => {
    try {
      const total = await debtsApi.getTotalActiveDebt();
      setTotalActiveDebt(total);
    } catch (error) {
      console.error('Failed to load total debt:', error);
    }
  }, []);

  const loadDebtPayments = useCallback(async (debtId: number) => {
    setLoadingPayments(true);
    try {
      const data = await debtsApi.getDebtPayments(debtId);
      setPayments(data);
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setLoadingPayments(false);
    }
  }, []);

  useEffect(() => {
    loadDebts();
    loadTotalDebt();
  }, [loadDebts, loadTotalDebt]);

  const handleSelectDebt = (debt: Debt) => {
    setSelectedDebt(debt);
    loadDebtPayments(debt.id);
  };

  const handleCloseDetail = () => {
    setSelectedDebt(null);
    setPayments([]);
  };

  const handleOpenPaymentModal = (fullPayment: boolean) => {
    setIsFullPayment(fullPayment);
    if (fullPayment && selectedDebt) {
      setPaymentAmount(selectedDebt.remainingAmount.toString());
    } else {
      setPaymentAmount('');
    }
    setPaymentMethod('CASH');
    setPaymentNotes('');
    setShowPaymentModal(true);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentAmount('');
    setPaymentNotes('');
  };

  const handleSubmitPayment = async () => {
    if (!selectedDebt) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    setSubmitting(true);
    try {
      if (isFullPayment) {
        await debtsApi.makeFullPayment(selectedDebt.id, {
          method: paymentMethod,
          notes: paymentNotes || undefined,
        });
      } else {
        await debtsApi.makePayment(selectedDebt.id, {
          amount,
          method: paymentMethod,
          notes: paymentNotes || undefined,
        });
      }

      handleClosePaymentModal();
      loadDebts();
      loadTotalDebt();

      // Refresh selected debt
      const updatedDebt = await debtsApi.getById(selectedDebt.id);
      setSelectedDebt(updatedDebt);
      loadDebtPayments(selectedDebt.id);
    } catch (error) {
      console.error('Failed to process payment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title">Qarzlar</h1>
          <p className="section-subtitle">Qarzlar nazorati va to'lovlar</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="pill">{totalElements} ta qarz</span>
          <span className="pill bg-error/10 text-error">
            Jami: {formatCurrency(totalActiveDebt)}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="surface-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/50">
              Filtrlar
            </h2>
            <p className="text-xs text-base-content/60">
              {statusFilter ? DEBT_STATUSES[statusFilter]?.label + " qarzlar" : "Barcha qarzlar"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="select select-bordered select-sm"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as DebtStatus | '');
                setPage(0);
              }}
            >
              <option value="">Barcha holatlar</option>
              {Object.entries(DEBT_STATUSES).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Debts List */}
        <div className="lg:col-span-2">
          <div className="surface-card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <span className="loading loading-spinner loading-lg" />
              </div>
            ) : debts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-10 text-center text-base-content/50">
                <Wallet className="h-12 w-12" />
                <div>
                  <p className="text-base font-medium">Qarzlar topilmadi</p>
                  <p className="text-sm">Filtrlarni o'zgartiring</p>
                </div>
              </div>
            ) : (
              <>
                <div className="hidden lg:block table-container">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>Mijoz</th>
                        <th>Faktura</th>
                        <th>Summa</th>
                        <th>Qoldiq</th>
                        <th>Holat</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {debts.map((debt) => (
                        <tr
                          key={debt.id}
                          className={clsx(
                            'cursor-pointer transition hover:bg-base-200/50',
                            debt.overdue && 'bg-error/5',
                            selectedDebt?.id === debt.id && 'bg-primary/10'
                          )}
                          onClick={() => handleSelectDebt(debt)}
                        >
                          <td>
                            <div className="font-medium">{debt.customerName}</div>
                            <div className="flex items-center gap-1 text-xs text-base-content/60">
                              <Phone className="h-3 w-3" />
                              {debt.customerPhone}
                            </div>
                          </td>
                          <td>
                            <span className="font-mono text-sm">
                              {debt.invoiceNumber || '-'}
                            </span>
                          </td>
                          <td>{formatCurrency(debt.originalAmount)}</td>
                          <td>
                            <span className="font-semibold text-error">
                              {formatCurrency(debt.remainingAmount)}
                            </span>
                          </td>
                          <td>
                            <span
                              className={clsx(
                                'badge badge-sm',
                                debt.status === 'PAID' && 'badge-success',
                                debt.status === 'ACTIVE' && !debt.overdue && 'badge-warning',
                                (debt.status === 'OVERDUE' || debt.overdue) && 'badge-error'
                              )}
                            >
                              {debt.overdue ? "Muddati o'tgan" : DEBT_STATUSES[debt.status]?.label}
                            </span>
                          </td>
                          <td>
                            <button className="btn btn-ghost btn-sm">
                              Batafsil
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="space-y-3 p-4 lg:hidden">
                  {debts.map((debt) => (
                    <div
                      key={debt.id}
                      className={clsx(
                        'surface-panel flex flex-col gap-3 rounded-xl p-4 cursor-pointer transition',
                        debt.overdue && 'border-error/30',
                        selectedDebt?.id === debt.id && 'ring-2 ring-primary'
                      )}
                      onClick={() => handleSelectDebt(debt)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{debt.customerName}</p>
                          <p className="text-xs text-base-content/60">
                            {debt.invoiceNumber || 'Fakturasiz'}
                          </p>
                        </div>
                        <span
                          className={clsx(
                            'badge badge-sm',
                            debt.status === 'PAID' && 'badge-success',
                            debt.status === 'ACTIVE' && !debt.overdue && 'badge-warning',
                            (debt.status === 'OVERDUE' || debt.overdue) && 'badge-error'
                          )}
                        >
                          {debt.overdue ? "Muddati o'tgan" : DEBT_STATUSES[debt.status]?.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-base-content/70">
                          Qoldiq: <span className="font-semibold text-error">{formatCurrency(debt.remainingAmount)}</span>
                        </div>
                        <div className="text-sm text-base-content/60">
                          {formatCurrency(debt.originalAmount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-wrap items-center justify-center gap-3 border-t border-base-200 p-4">
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={page === 0}
                      onClick={() => setPage(page - 1)}
                    >
                      « Oldingi
                    </button>
                    <span className="pill">
                      Sahifa {page + 1} / {totalPages}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(page + 1)}
                    >
                      Keyingi »
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Debt Detail Panel */}
        <div className="lg:col-span-1">
          {selectedDebt ? (
            <div className="surface-card p-4 space-y-4 sticky top-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{selectedDebt.customerName}</h3>
                  <p className="text-sm text-base-content/60">
                    {selectedDebt.invoiceNumber || 'Fakturasiz qarz'}
                  </p>
                </div>
                <button
                  className="btn btn-ghost btn-sm btn-circle"
                  onClick={handleCloseDetail}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="surface-soft rounded-lg p-3">
                  <p className="text-xs text-base-content/60">Asosiy summa</p>
                  <p className="font-semibold">{formatCurrency(selectedDebt.originalAmount)}</p>
                </div>
                <div className="surface-soft rounded-lg p-3">
                  <p className="text-xs text-base-content/60">To'langan</p>
                  <p className="font-semibold text-success">{formatCurrency(selectedDebt.paidAmount)}</p>
                </div>
                <div className="surface-soft rounded-lg p-3 col-span-2">
                  <p className="text-xs text-base-content/60">Qoldiq</p>
                  <p className="text-xl font-bold text-error">{formatCurrency(selectedDebt.remainingAmount)}</p>
                </div>
              </div>

              {selectedDebt.dueDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-base-content/50" />
                  <span>Muddat: {formatDate(selectedDebt.dueDate)}</span>
                  {selectedDebt.overdue && (
                    <span className="badge badge-error badge-sm">O'tgan</span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-base-content/50" />
                <span>{selectedDebt.customerPhone}</span>
              </div>

              {selectedDebt.status !== 'PAID' && (
                <div className="flex gap-2">
                  <button
                    className="btn btn-primary flex-1"
                    onClick={() => handleOpenPaymentModal(false)}
                  >
                    <Wallet className="h-4 w-4" />
                    Qisman to'lash
                  </button>
                  <button
                    className="btn btn-success flex-1"
                    onClick={() => handleOpenPaymentModal(true)}
                  >
                    <CheckCircle className="h-4 w-4" />
                    To'liq to'lash
                  </button>
                </div>
              )}

              {/* Payment History */}
              <div className="border-t border-base-200 pt-4">
                <h4 className="text-sm font-semibold mb-3">To'lovlar tarixi</h4>
                {loadingPayments ? (
                  <div className="flex justify-center py-4">
                    <span className="loading loading-spinner loading-sm" />
                  </div>
                ) : payments.length === 0 ? (
                  <p className="text-sm text-base-content/50 text-center py-4">
                    To'lovlar yo'q
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="surface-soft rounded-lg p-3 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-success">
                            +{formatCurrency(payment.amount)}
                          </span>
                          <span className="badge badge-outline badge-xs">
                            {PAYMENT_METHODS[payment.method]?.label}
                          </span>
                        </div>
                        <div className="text-xs text-base-content/60 mt-1">
                          {formatDateTime(payment.paymentDate)}
                        </div>
                        {payment.notes && (
                          <div className="text-xs text-base-content/70 mt-1">
                            {payment.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="surface-card p-8 text-center text-base-content/50">
              <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Batafsil ko'rish uchun qarzni tanlang</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedDebt && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">
                  {isFullPayment ? "To'liq to'lov" : "Qisman to'lov"}
                </h3>
                <p className="text-sm text-base-content/60">
                  {selectedDebt.customerName} - Qoldiq: {formatCurrency(selectedDebt.remainingAmount)}
                </p>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleClosePaymentModal}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="form-control">
                <NumberInput
                  label="To'lov summasi *"
                  value={paymentAmount}
                  onChange={(val) => setPaymentAmount(String(val))}
                  disabled={isFullPayment}
                  min={0}
                  max={selectedDebt.remainingAmount}
                  step={1000}
                  placeholder="0"
                />
                {!isFullPayment && (
                  <span className="label-text-alt mt-1 text-base-content/50">
                    Maksimum: {formatCurrency(selectedDebt.remainingAmount)}
                  </span>
                )}
              </div>

              <label className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  To'lov usuli *
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(PAYMENT_METHODS)
                    .filter(([key]) => key !== 'MIXED')
                    .map(([key, { label }]) => (
                      <button
                        key={key}
                        type="button"
                        className={clsx(
                          'btn btn-sm',
                          paymentMethod === key ? 'btn-primary' : 'btn-outline'
                        )}
                        onClick={() => setPaymentMethod(key as PaymentMethod)}
                      >
                        {key === 'CASH' && <Banknote className="h-4 w-4" />}
                        {key === 'CARD' && <CreditCard className="h-4 w-4" />}
                        {key === 'TRANSFER' && <Building className="h-4 w-4" />}
                        {label}
                      </button>
                    ))}
                </div>
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

            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={handleClosePaymentModal}
                disabled={submitting}
              >
                Bekor qilish
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmitPayment}
                disabled={
                  submitting ||
                  (!isFullPayment && (isNaN(parseFloat(paymentAmount)) || parseFloat(paymentAmount) <= 0))
                }
              >
                {submitting && <span className="loading loading-spinner loading-sm" />}
                {isFullPayment ? "To'liq to'lash" : "To'lash"}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleClosePaymentModal} />
        </div>
      )}
    </div>
  );
}

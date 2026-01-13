import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { formatCurrency, formatDate, formatDateTime, DEBT_STATUSES, PAYMENT_METHODS } from '../../config/constants';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { Select } from '../../components/ui/Select';
import { DataTable, Column } from '../../components/ui/DataTable';
import { ModalPortal } from '../../components/common/Modal';
import type { Debt, DebtStatus, Payment, PaymentMethod } from '../../types';
import { useNotificationsStore } from '../../store/notificationsStore';

export function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { notifications } = useNotificationsStore();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [statusFilter, setStatusFilter] = useState<DebtStatus | ''>('');
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isFullPayment, setIsFullPayment] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Stats
  const [totalActiveDebt, setTotalActiveDebt] = useState(0);

  // Table columns
  const columns: Column<Debt>[] = useMemo(() => [
    {
      key: 'customerName',
      header: 'Mijoz',
      render: (debt) => (
        <div>
          <div className="font-medium">{debt.customerName}</div>
          <div className="flex items-center gap-1 text-xs text-base-content/60">
            <Phone className="h-3 w-3" />
            {debt.customerPhone}
          </div>
        </div>
      ),
    },
    {
      key: 'invoiceNumber',
      header: 'Faktura',
      render: (debt) => (
        <span className="font-mono text-sm">
          {debt.invoiceNumber || '-'}
        </span>
      ),
    },
    {
      key: 'originalAmount',
      header: 'Summa',
      getValue: (debt) => debt.originalAmount,
      render: (debt) => formatCurrency(debt.originalAmount),
    },
    {
      key: 'remainingAmount',
      header: 'Qoldiq',
      getValue: (debt) => debt.remainingAmount,
      render: (debt) => (
        <span className="font-semibold text-error">
          {formatCurrency(debt.remainingAmount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Holat',
      render: (debt) => (
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
      ),
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      render: () => (
        <button className="btn btn-ghost btn-sm">
          Batafsil
        </button>
      ),
    },
  ], []);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  const loadDebts = useCallback(async (isInitial = false) => {
    if (!isInitial) {
      setRefreshing(true);
    }
    try {
      const data = await debtsApi.getAll({
        page,
        size: pageSize,
        status: statusFilter || undefined,
      });
      setDebts(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (error) {
      console.error('Failed to load debts:', error);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [page, pageSize, statusFilter]);

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
    loadDebts(true);
    loadTotalDebt();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when filters change
  useEffect(() => {
    loadDebts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, statusFilter]);

  // WebSocket orqali yangi notification kelganda qarzlarni yangilash
  useEffect(() => {
    if (notifications.length > 0) {
      loadDebts();
      loadTotalDebt();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.length]);

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
      setPaymentAmount(selectedDebt.remainingAmount);
    } else {
      setPaymentAmount(0);
    }
    setPaymentMethod('CASH');
    setPaymentNotes('');
    setShowPaymentModal(true);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentAmount(0);
    setPaymentNotes('');
  };

  const handleSubmitPayment = async () => {
    if (!selectedDebt) return;
    if (paymentAmount <= 0) return;

    setSubmitting(true);
    try {
      if (isFullPayment) {
        await debtsApi.makeFullPayment(selectedDebt.id, {
          method: paymentMethod,
          notes: paymentNotes || undefined,
        });
      } else {
        await debtsApi.makePayment(selectedDebt.id, {
          amount: paymentAmount,
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
          <Select
            value={statusFilter || undefined}
            onChange={(val) => {
              setStatusFilter((val as DebtStatus | '') || '');
              setPage(0);
            }}
            options={[
              { value: '', label: 'Barcha holatlar' },
              ...Object.entries(DEBT_STATUSES).map(([key, { label }]) => ({
                value: key,
                label,
              })),
            ]}
            placeholder="Barcha holatlar"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Debts List */}
        <div className="lg:col-span-2 relative">
          {refreshing && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-base-100/60 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <span className="text-sm font-medium text-base-content/70">Yangilanmoqda...</span>
              </div>
            </div>
          )}
          <DataTable
            data={debts}
            columns={columns}
            keyExtractor={(debt) => debt.id}
            loading={initialLoading}
            emptyIcon={<Wallet className="h-12 w-12" />}
            emptyTitle="Qarzlar topilmadi"
            emptyDescription="Filtrlarni o'zgartiring"
            onRowClick={handleSelectDebt}
            rowClassName={(debt) => clsx(
              debt.overdue && 'bg-error/5',
              selectedDebt?.id === debt.id && 'bg-primary/10'
            )}
            currentPage={page}
            totalPages={totalPages}
            totalElements={totalElements}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
            renderMobileCard={(debt) => (
              <div
                className={clsx(
                  'surface-panel flex flex-col gap-3 rounded-xl p-4 cursor-pointer transition',
                  debt.overdue && 'border-error/30',
                  selectedDebt?.id === debt.id && 'ring-2 ring-primary'
                )}
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
            )}
          />
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
      <ModalPortal isOpen={showPaymentModal && !!selectedDebt} onClose={handleClosePaymentModal}>
        {selectedDebt && (
          <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl">
            <div className="p-4 sm:p-6">
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
                <CurrencyInput
                  label="To'lov summasi *"
                  value={paymentAmount}
                  onChange={setPaymentAmount}
                  disabled={isFullPayment}
                  min={0}
                  max={selectedDebt.remainingAmount}
                  showQuickButtons={!isFullPayment}
                />

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

              <div className="mt-6 flex justify-end gap-2">
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
                  disabled={submitting || (!isFullPayment && paymentAmount <= 0)}
                >
                  {submitting && <span className="loading loading-spinner loading-sm" />}
                  {isFullPayment ? "To'liq to'lash" : "To'lash"}
                </button>
              </div>
            </div>
          </div>
        )}
      </ModalPortal>
    </div>
  );
}

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
  List,
  Users,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
} from 'lucide-react';
import clsx from 'clsx';
import { debtsApi } from '../../api/debts.api';
import { formatCurrency, formatDate, formatDateTime, DEBT_STATUSES, PAYMENT_METHODS } from '../../config/constants';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { DataTable, Column } from '../../components/ui/DataTable';
import { ModalPortal } from '../../components/common/Modal';
import type { Debt, DebtStatus, Payment, PaymentMethod } from '../../types';
import { useNotificationsStore } from '../../store/notificationsStore';
import { useHighlight } from '../../hooks/useHighlight';
import { usePermission, PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';

type TabType = 'all' | 'by-customer' | 'overdue' | 'stats';

interface CustomerDebtSummary {
  customerId: number;
  customerName: string;
  customerPhone: string;
  totalDebts: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  overdueCount: number;
  overdueAmount: number;
  debts: Debt[];
}

export function DebtsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [debts, setDebts] = useState<Debt[]>([]);
  const [allDebts, setAllDebts] = useState<Debt[]>([]); // For statistics and grouping
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { notifications } = useNotificationsStore();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [statusFilter, setStatusFilter] = useState<DebtStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [expandedCustomer, setExpandedCustomer] = useState<number | null>(null);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isFullPayment, setIsFullPayment] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Stats - used for header display
  const [, setTotalActiveDebt] = useState(0);

  const { highlightId, clearHighlight } = useHighlight();
  const { hasPermission } = usePermission();

  // Early return if no VIEW permission - prevents API calls
  if (!hasPermission(PermissionCode.DEBTS_VIEW)) {
    return null;
  }

  // Tabs configuration
  const tabs = [
    { id: 'all' as TabType, label: 'Umumiy ro\'yxat', icon: List },
    { id: 'by-customer' as TabType, label: 'Mijozlar kesimida', icon: Users },
    { id: 'overdue' as TabType, label: 'Muddati o\'tgan', icon: AlertTriangle },
    { id: 'stats' as TabType, label: 'Statistika', icon: BarChart3 },
  ];

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

  // Load all debts for statistics and grouping (without pagination)
  const loadAllDebts = useCallback(async () => {
    try {
      const data = await debtsApi.getAll({
        page: 0,
        size: 1000, // Load more for stats
        status: undefined,
      });
      setAllDebts(data.content);
    } catch (error) {
      console.error('Failed to load all debts:', error);
    }
  }, []);

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
    loadAllDebts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Customer debt summaries (grouped by customer)
  const customerDebtSummaries = useMemo((): CustomerDebtSummary[] => {
    const customerMap = new Map<number, CustomerDebtSummary>();

    allDebts.forEach(debt => {
      if (debt.status === 'PAID') return; // Skip paid debts

      const existing = customerMap.get(debt.customerId);
      if (existing) {
        existing.totalDebts++;
        existing.totalAmount += debt.originalAmount;
        existing.paidAmount += debt.paidAmount;
        existing.remainingAmount += debt.remainingAmount;
        if (debt.overdue) {
          existing.overdueCount++;
          existing.overdueAmount += debt.remainingAmount;
        }
        existing.debts.push(debt);
      } else {
        customerMap.set(debt.customerId, {
          customerId: debt.customerId,
          customerName: debt.customerName,
          customerPhone: debt.customerPhone,
          totalDebts: 1,
          totalAmount: debt.originalAmount,
          paidAmount: debt.paidAmount,
          remainingAmount: debt.remainingAmount,
          overdueCount: debt.overdue ? 1 : 0,
          overdueAmount: debt.overdue ? debt.remainingAmount : 0,
          debts: [debt],
        });
      }
    });

    return Array.from(customerMap.values()).sort((a, b) => b.remainingAmount - a.remainingAmount);
  }, [allDebts]);

  // Overdue debts with days calculation
  const overdueDebts = useMemo(() => {
    return allDebts
      .filter(debt => debt.overdue && debt.status !== 'PAID')
      .map(debt => {
        const dueDate = debt.dueDate ? new Date(debt.dueDate) : null;
        const today = new Date();
        const daysOverdue = dueDate ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        return { ...debt, daysOverdue };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [allDebts]);

  // Statistics calculations
  const stats = useMemo(() => {
    const activeDebts = allDebts.filter(d => d.status !== 'PAID');
    const paidDebts = allDebts.filter(d => d.status === 'PAID');

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Calculate paid amounts by period (based on debt creation dates)
    const paidToday = paidDebts.filter(d => new Date(d.createdAt) >= startOfDay)
      .reduce((sum, d) => sum + d.originalAmount, 0);
    const paidThisWeek = paidDebts.filter(d => new Date(d.createdAt) >= startOfWeek)
      .reduce((sum, d) => sum + d.originalAmount, 0);
    const paidThisMonth = paidDebts.filter(d => new Date(d.createdAt) >= startOfMonth)
      .reduce((sum, d) => sum + d.originalAmount, 0);

    return {
      totalActiveDebt: activeDebts.reduce((sum, d) => sum + d.remainingAmount, 0),
      totalDebtsCount: activeDebts.length,
      overdueCount: activeDebts.filter(d => d.overdue).length,
      overdueAmount: activeDebts.filter(d => d.overdue).reduce((sum, d) => sum + d.remainingAmount, 0),
      paidToday,
      paidThisWeek,
      paidThisMonth,
      topDebtors: customerDebtSummaries.slice(0, 5),
    };
  }, [allDebts, customerDebtSummaries]);

  // Filtered debts for search
  const filteredDebts = useMemo(() => {
    if (!searchQuery) return debts;
    const query = searchQuery.toLowerCase();
    return debts.filter(debt =>
      debt.customerName.toLowerCase().includes(query) ||
      debt.customerPhone.includes(query) ||
      debt.invoiceNumber?.toLowerCase().includes(query)
    );
  }, [debts, searchQuery]);

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
      loadAllDebts();
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
      loadAllDebts();

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

  // Helper function to get severity for overdue debts
  const getOverdueSeverity = (daysOverdue: number) => {
    if (daysOverdue >= 30) return { level: 'critical', label: '30+ kun', color: 'text-error', bg: 'bg-error/10' };
    if (daysOverdue >= 7) return { level: 'warning', label: '7-30 kun', color: 'text-warning', bg: 'bg-warning/10' };
    return { level: 'info', label: '1-7 kun', color: 'text-info', bg: 'bg-info/10' };
  };

  // Render the detail panel (shared across tabs)
  const renderDetailPanel = () => (
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
              <PermissionGate permission={PermissionCode.DEBTS_PAY}>
                <button
                  className="btn btn-primary flex-1"
                  onClick={() => handleOpenPaymentModal(false)}
                >
                  <Wallet className="h-4 w-4" />
                  Qisman to'lash
                </button>
              </PermissionGate>
              <PermissionGate permission={PermissionCode.DEBTS_PAY}>
                <button
                  className="btn btn-success flex-1"
                  onClick={() => handleOpenPaymentModal(true)}
                >
                  <CheckCircle className="h-4 w-4" />
                  To'liq to'lash
                </button>
              </PermissionGate>
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
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title">Qarzlar</h1>
          <p className="section-subtitle">Qarzlar nazorati va to'lovlar</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="pill">{stats.totalDebtsCount} ta faol qarz</span>
          {stats.overdueCount > 0 && (
            <span className="pill bg-error/10 text-error">
              {stats.overdueCount} ta muddati o'tgan
            </span>
          )}
          <span className="pill bg-error/10 text-error font-semibold">
            Jami: {formatCurrency(stats.totalActiveDebt)}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="surface-card">
        <div className="flex overflow-x-auto border-b border-base-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedDebt(null);
                }}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-base-content/60 hover:text-base-content hover:bg-base-200/50'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.id === 'overdue' && stats.overdueCount > 0 && (
                  <span className="badge badge-error badge-xs">{stats.overdueCount}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {/* Tab 1: Umumiy ro'yxat */}
          {activeTab === 'all' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <SearchInput
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                    placeholder="Qidirish..."
                    hideLabel
                    ariaLabel="Qidirish"
                    leadingIcon={<Phone className="h-5 w-5" />}
                    className="w-48"
                  />
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
                <p className="text-sm text-base-content/60">
                  {searchQuery ? `"${searchQuery}" bo'yicha ${filteredDebts.length} ta natija` : `${totalElements} ta qarz`}
                </p>
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
                    data={filteredDebts}
                    columns={columns}
                    keyExtractor={(debt) => debt.id}
                    loading={initialLoading && !refreshing}
                    highlightId={highlightId}
                    onHighlightComplete={clearHighlight}
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

                {/* Detail Panel */}
                {renderDetailPanel()}
              </div>
            </div>
          )}

          {/* Tab 2: Mijozlar kesimida */}
          {activeTab === 'by-customer' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-base-content/60">
                  {customerDebtSummaries.length} ta qarzdor mijoz
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-3">
                  {customerDebtSummaries.length === 0 ? (
                    <div className="surface-soft rounded-xl p-8 text-center">
                      <Users className="h-12 w-12 mx-auto mb-3 text-base-content/30" />
                      <p className="text-base-content/60">Qarzdor mijozlar yo'q</p>
                    </div>
                  ) : (
                    customerDebtSummaries.map((customer) => (
                      <div
                        key={customer.customerId}
                        className="surface-soft rounded-xl overflow-hidden"
                      >
                        <button
                          onClick={() => setExpandedCustomer(
                            expandedCustomer === customer.customerId ? null : customer.customerId
                          )}
                          className="w-full p-4 flex items-center justify-between hover:bg-base-200/50 transition"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div className="text-left">
                              <p className="font-semibold">{customer.customerName}</p>
                              <p className="text-xs text-base-content/60">{customer.customerPhone}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-lg font-bold text-error">
                                {formatCurrency(customer.remainingAmount)}
                              </p>
                              <p className="text-xs text-base-content/60">
                                {customer.totalDebts} ta qarz
                                {customer.overdueCount > 0 && (
                                  <span className="text-error ml-1">
                                    ({customer.overdueCount} ta o'tgan)
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className={clsx(
                              'transition-transform',
                              expandedCustomer === customer.customerId && 'rotate-180'
                            )}>
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </button>

                        {/* Expanded customer debts */}
                        {expandedCustomer === customer.customerId && (
                          <div className="border-t border-base-200 p-3 space-y-2 bg-base-100/50">
                            {customer.debts.map((debt) => (
                              <button
                                key={debt.id}
                                onClick={() => handleSelectDebt(debt)}
                                className={clsx(
                                  'w-full p-3 rounded-lg flex items-center justify-between hover:bg-base-200/50 transition text-left',
                                  debt.overdue && 'bg-error/5',
                                  selectedDebt?.id === debt.id && 'ring-2 ring-primary'
                                )}
                              >
                                <div>
                                  <p className="text-sm font-medium">
                                    {debt.invoiceNumber || 'Fakturasiz'}
                                  </p>
                                  {debt.dueDate && (
                                    <p className="text-xs text-base-content/60">
                                      Muddat: {formatDate(debt.dueDate)}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-error">
                                    {formatCurrency(debt.remainingAmount)}
                                  </span>
                                  {debt.overdue && (
                                    <span className="badge badge-error badge-xs">O'tgan</span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Detail Panel */}
                {renderDetailPanel()}
              </div>
            </div>
          )}

          {/* Tab 3: Muddati o'tgan */}
          {activeTab === 'overdue' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-base-content/60">
                  {overdueDebts.length} ta muddati o'tgan qarz
                </p>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs">
                    <span className="h-2 w-2 rounded-full bg-info"></span>
                    1-7 kun
                  </span>
                  <span className="flex items-center gap-1 text-xs">
                    <span className="h-2 w-2 rounded-full bg-warning"></span>
                    7-30 kun
                  </span>
                  <span className="flex items-center gap-1 text-xs">
                    <span className="h-2 w-2 rounded-full bg-error"></span>
                    30+ kun
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-2">
                  {overdueDebts.length === 0 ? (
                    <div className="surface-soft rounded-xl p-8 text-center">
                      <CheckCircle className="h-12 w-12 mx-auto mb-3 text-success" />
                      <p className="text-base-content/60">Muddati o'tgan qarzlar yo'q</p>
                    </div>
                  ) : (
                    overdueDebts.map((debt) => {
                      const severity = getOverdueSeverity(debt.daysOverdue);
                      return (
                        <button
                          key={debt.id}
                          onClick={() => handleSelectDebt(debt)}
                          className={clsx(
                            'w-full surface-soft rounded-xl p-4 flex items-center gap-4 hover:bg-base-200/50 transition text-left',
                            selectedDebt?.id === debt.id && 'ring-2 ring-primary'
                          )}
                        >
                          <div className={clsx(
                            'h-12 w-12 rounded-xl flex flex-col items-center justify-center',
                            severity.bg
                          )}>
                            <Clock className={clsx('h-5 w-5', severity.color)} />
                            <span className={clsx('text-[10px] font-bold', severity.color)}>
                              {debt.daysOverdue}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold truncate">{debt.customerName}</p>
                              <span className={clsx(
                                'badge badge-xs',
                                severity.level === 'critical' && 'badge-error',
                                severity.level === 'warning' && 'badge-warning',
                                severity.level === 'info' && 'badge-info'
                              )}>
                                {debt.daysOverdue} kun
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-base-content/60">
                              <span>{debt.customerPhone}</span>
                              <span>•</span>
                              <span>{debt.invoiceNumber || 'Fakturasiz'}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-error">
                              {formatCurrency(debt.remainingAmount)}
                            </p>
                            <p className="text-xs text-base-content/60">
                              Muddat: {debt.dueDate ? formatDate(debt.dueDate) : '-'}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Detail Panel */}
                {renderDetailPanel()}
              </div>
            </div>
          )}

          {/* Tab 4: Statistika */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="surface-soft rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-error/10 flex items-center justify-center">
                      <Wallet className="h-5 w-5 text-error" />
                    </div>
                    <div>
                      <p className="text-xs text-base-content/60">Jami qarz</p>
                      <p className="text-lg font-bold text-error">
                        {formatCurrency(stats.totalActiveDebt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="surface-soft rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-xs text-base-content/60">Bugun to'langan</p>
                      <p className="text-lg font-bold text-success">
                        {formatCurrency(stats.paidToday)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="surface-soft rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-base-content/60">Bu hafta</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(stats.paidThisWeek)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="surface-soft rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                      <TrendingDown className="h-5 w-5 text-info" />
                    </div>
                    <div>
                      <p className="text-xs text-base-content/60">Bu oy</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(stats.paidThisMonth)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overdue Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="surface-soft rounded-xl p-4">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-error" />
                    Muddati o'tgan qarzlar
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-3xl font-bold text-error">{stats.overdueCount}</p>
                      <p className="text-sm text-base-content/60">ta qarz</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-error">
                        {formatCurrency(stats.overdueAmount)}
                      </p>
                      <p className="text-sm text-base-content/60">umumiy summa</p>
                    </div>
                  </div>
                </div>

                {/* Top Debtors */}
                <div className="surface-soft rounded-xl p-4">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Top 5 qarzdor
                  </h3>
                  {stats.topDebtors.length === 0 ? (
                    <p className="text-sm text-base-content/50">Qarzdorlar yo'q</p>
                  ) : (
                    <div className="space-y-2">
                      {stats.topDebtors.map((customer, index) => (
                        <div
                          key={customer.customerId}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-base-200/50"
                        >
                          <div className="flex items-center gap-3">
                            <span className={clsx(
                              'h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold',
                              index === 0 && 'bg-yellow-500/20 text-yellow-600',
                              index === 1 && 'bg-gray-400/20 text-gray-600',
                              index === 2 && 'bg-amber-600/20 text-amber-700',
                              index > 2 && 'bg-base-200 text-base-content/60'
                            )}>
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-medium text-sm">{customer.customerName}</p>
                              <p className="text-xs text-base-content/60">{customer.totalDebts} ta qarz</p>
                            </div>
                          </div>
                          <span className="font-semibold text-error">
                            {formatCurrency(customer.remainingAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
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

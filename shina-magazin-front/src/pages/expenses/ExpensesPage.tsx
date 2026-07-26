import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Receipt, Pencil, Trash2, Plus, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { expensesApi } from '../../api/expenses.api';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatCurrency, formatDate, formatDateForApi } from '../../config/constants';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Select } from '../../components/ui/Select';
import { ModalPortal } from '../../components/common/Modal';
import { PermissionGate } from '../../components/common/PermissionGate';
import { PermissionCode } from '../../hooks/usePermission';
import { Button, ConfirmDialog } from '@/ui';
import { EXPENSE_CATEGORIES } from '../../types';
import type { Expense, ExpenseCategory, PaymentMethod } from '../../types';

const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'CARD', 'TRANSFER'];

/** Oxirgi 30 kun — xarajatlar odatda oylik ko'riladi. */
function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return { start: formatDateForApi(start), end: formatDateForApi(end) };
}

interface FormState {
  expenseDate: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  paymentMethod: PaymentMethod;
}

function emptyForm(): FormState {
  return {
    expenseDate: formatDateForApi(new Date()),
    category: 'OTHER',
    amount: 0,
    description: '',
    paymentMethod: 'CASH',
  };
}

/**
 * Do'kon xarajatlari.
 *
 * <p>Ilgari tizim faqat yalpi marjani bilardi — ijara, maosh, kommunal hech
 * qayerda qayd etilmasdi. Bu sahifa sof foyda hisobining kirish nuqtasi.
 */
export function ExpensesPage() {
  const { t } = useTranslation();
  const [range, setRange] = useState(defaultRange);
  const [category, setCategory] = useState<ExpenseCategory | ''>('');

  const categoryOptions = useMemo(
    () =>
      EXPENSE_CATEGORIES.map((c) => ({
        value: c,
        label: t(`erp.expenses.categories.${c}`),
      })),
    [t]
  );

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Expense | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await expensesApi.getAll({
        startDate: range.start,
        endDate: range.end,
        category: category || undefined,
        page,
      });
      setExpenses(result.content);
      setTotalElements(result.totalElements);
      setTotalPages(result.totalPages);
      setLoadError(null);
    } catch (error) {
      console.error('Failed to load expenses:', error);
      setLoadError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [range.start, range.end, category, page]);

  useEffect(() => {
    void load();
  }, [load]);

  // Filtr o'zgarganda birinchi sahifaga qaytamiz: aks holda 5-sahifada
  // turgan foydalanuvchi filtrni o'zgartirsa bo'sh ro'yxat ko'rardi.
  useEffect(() => {
    setPage(0);
  }, [range.start, range.end, category]);

  /** Sahifadagi jami — butun davr emas, shuning uchun alohida belgilanadi. */
  const pageTotal = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (expense: Expense) => {
    setEditing(expense);
    setForm({
      expenseDate: expense.expenseDate,
      category: expense.category,
      amount: expense.amount,
      description: expense.description ?? '',
      paymentMethod: expense.paymentMethod,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (form.amount <= 0) {
      toast.error(t('erp.expenses.amountRequired'));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        expenseDate: form.expenseDate,
        category: form.category,
        amount: form.amount,
        description: form.description.trim() || undefined,
        paymentMethod: form.paymentMethod,
      };
      if (editing) {
        await expensesApi.update(editing.id, payload);
        toast.success(t('erp.expenses.updated'));
      } else {
        await expensesApi.create(payload);
        toast.success(t('erp.expenses.created'));
      }
      setShowForm(false);
      void load();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await expensesApi.remove(deleting.id);
      toast.success(t('erp.expenses.deleted'));
      setDeleting(null);
      void load();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const columns: Column<Expense>[] = [
    {
      key: 'expenseDate',
      header: t('erp.expenses.date'),
      render: (e) => formatDate(e.expenseDate),
    },
    {
      key: 'category',
      header: t('erp.expenses.category'),
      render: (e) => t(`erp.expenses.categories.${e.category}`),
    },
    {
      key: 'description',
      header: t('erp.expenses.description'),
      render: (e) => e.description || '—',
    },
    {
      key: 'paymentMethod',
      header: t('erp.expenses.paymentMethod'),
      render: (e) => (
        <span className="flex items-center gap-1">
          {t(`erp.enum.payment.${e.paymentMethod}`)}
          {/* Kassaga bog'langan xarajat Z-hisobotga ta'sir qiladi */}
          {e.shiftId != null && <Wallet className="h-3.5 w-3.5 text-base-content/40" />}
        </span>
      ),
    },
    {
      key: 'amount',
      header: t('erp.expenses.amount'),
      className: 'text-right',
      headerClassName: 'text-right',
      render: (e) => <span className="font-semibold">{formatCurrency(e.amount)}</span>,
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      render: (e) => (
        <div className="flex justify-end gap-1">
          <PermissionGate permission={PermissionCode.EXPENSES_UPDATE}>
            <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>
              <Pencil className="h-4 w-4" />
            </Button>
          </PermissionGate>
          <PermissionGate permission={PermissionCode.EXPENSES_DELETE}>
            <Button variant="ghost" size="sm" onClick={() => setDeleting(e)}>
              <Trash2 className="h-4 w-4 text-error" />
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="section-title">{t('erp.expenses.title')}</h1>
          <p className="section-subtitle">{t('erp.expenses.subtitle')}</p>
        </div>
        <PermissionGate permission={PermissionCode.EXPENSES_CREATE}>
          <Button variant="primary" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t('erp.expenses.add')}
          </Button>
        </PermissionGate>
      </div>

      {/* Filtrlar */}
      <div className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <label className="form-control">
          <span className="label-text mb-1">{t('erp.reports.startDate')}</span>
          <input
            type="date"
            className="input input-bordered"
            value={range.start}
            onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))}
          />
        </label>
        <label className="form-control">
          <span className="label-text mb-1">{t('erp.reports.endDate')}</span>
          <input
            type="date"
            className="input input-bordered"
            value={range.end}
            onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))}
          />
        </label>
        <div className="sm:min-w-52">
          <Select
            label={t('erp.expenses.category')}
            value={category}
            onChange={(v) => setCategory((v as ExpenseCategory | '') ?? '')}
            options={[
              { value: '', label: t('erp.expenses.allCategories') },
              ...categoryOptions,
            ]}
          />
        </div>
        <div className="sm:ml-auto sm:text-right">
          <p className="text-sm text-base-content/60">{t('erp.expenses.pageTotal')}</p>
          <p className="text-xl font-semibold">{formatCurrency(pageTotal)}</p>
        </div>
      </div>

      <DataTable
        data={expenses}
        columns={columns}
        keyExtractor={(e) => e.id}
        loading={loading}
        error={loadError}
        onRetry={load}
        totalElements={totalElements}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        emptyIcon={<Receipt className="h-12 w-12" />}
        emptyTitle={t('erp.expenses.emptyTitle')}
        emptyDescription={t('erp.expenses.emptyDescription')}
      />

      {/* Qo'shish / tahrirlash */}
      <ModalPortal isOpen={showForm} onClose={() => setShowForm(false)}>
        <div className="w-full max-w-md rounded-2xl bg-base-100 p-6 shadow-2xl">
          <h3 className="text-lg font-semibold">
            {editing ? t('erp.expenses.editTitle') : t('erp.expenses.addTitle')}
          </h3>

          <div className="mt-4 space-y-3">
            <label className="form-control">
              <span className="label-text mb-1">{t('erp.expenses.date')}</span>
              {/* Xarajat SODIR BO'LGAN sana — kechagi xarajatni ertalab
                  kiritish mumkin, P&L uni o'sha kunga yozadi. */}
              <input
                type="date"
                className="input input-bordered"
                value={form.expenseDate}
                onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))}
              />
            </label>

            <Select
              label={t('erp.expenses.category')}
              value={form.category}
              onChange={(v) => setForm((f) => ({ ...f, category: v as ExpenseCategory }))}
              options={categoryOptions}
            />

            <CurrencyInput
              label={t('erp.expenses.amount')}
              value={form.amount}
              onChange={(v) => setForm((f) => ({ ...f, amount: Number(v) || 0 }))}
              required
            />

            <div>
              <Select
                label={t('erp.expenses.paymentMethod')}
                value={form.paymentMethod}
                onChange={(v) => setForm((f) => ({ ...f, paymentMethod: v as PaymentMethod }))}
                options={PAYMENT_METHODS.map((m) => ({
                  value: m,
                  label: t(`erp.enum.payment.${m}`),
                }))}
              />
              {/* Naqd xarajat ochiq smenaga bog'lanadi va Z-hisobotda
                  kutilgan kassadan ayiriladi. */}
              {form.paymentMethod === 'CASH' && (
                <span className="mt-1 block text-xs text-base-content/60">
                  {t('erp.expenses.cashHint')}
                </span>
              )}
            </div>

            <label className="form-control">
              <span className="label-text mb-1">{t('erp.expenses.description')}</span>
              <input
                className="input input-bordered"
                maxLength={500}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      </ModalPortal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title={t('erp.expenses.deleteTitle')}
        description={
          deleting
            ? t('erp.expenses.deleteMessage', { amount: formatCurrency(deleting.amount) })
            : undefined
        }
        danger
      />
    </div>
  );
}

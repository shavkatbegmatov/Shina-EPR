import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Printer, Wallet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { shiftsApi } from '../../api/shifts.api';
import { settingsApi } from '../../api/settings.api';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatCurrency, formatDateTime } from '../../config/constants';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { DataTable, Column } from '../../components/ui/DataTable';
import { ModalPortal } from '../../components/common/Modal';
import { PermissionGate } from '../../components/common/PermissionGate';
import { PermissionCode } from '../../hooks/usePermission';
import { ZReportPrint } from '../../components/receipt/ZReportPrint';
import { Button } from '@/ui';
import type { CashShift, ReceiptSettings, ZReport } from '../../types';

/**
 * Kassa smenasi — ochish, yopish va Z-hisobot.
 *
 * <p>Asosiy savol: kassir kun oxirida qancha pul topshirishi kerak. Smena
 * boshida kassadagi mayda pul qayd etiladi, savdolar smenaga bog'lanadi,
 * yopishda esa sanalgan pul tizim kutgan summa bilan solishtiriladi.
 */
export function ShiftsPage() {
  const { t } = useTranslation();

  const [current, setCurrent] = useState<CashShift | null>(null);
  const [history, setHistory] = useState<CashShift[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<ReceiptSettings>();

  const [showOpen, setShowOpen] = useState(false);
  const [openingFloat, setOpeningFloat] = useState(0);
  const [showClose, setShowClose] = useState(false);
  const [countedCash, setCountedCash] = useState(0);
  const [closeNotes, setCloseNotes] = useState('');
  const [saving, setSaving] = useState(false);

  /** Chop etiladigan Z-hisobot (yopilgandan keyin yoki tarixdan tanlanganda). */
  const [printing, setPrinting] = useState<ZReport | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [shift, page] = await Promise.all([shiftsApi.getCurrent(), shiftsApi.getAll(0, 20)]);
      setCurrent(shift);
      setHistory(page.content);
      setLoadError(null);
    } catch (error) {
      console.error('Failed to load shifts:', error);
      setLoadError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    settingsApi.get().then(setSettings).catch(() => {
      /* sarlavhasiz hisobot — chop etish baribir ishlaydi */
    });
  }, [load]);

  // Chop etish DOM'ga qo'yilgandan KEYIN — aks holda bo'sh sahifa chiqadi
  useEffect(() => {
    if (!printing) return;
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
    return () => cancelAnimationFrame(frame);
  }, [printing]);

  const handleOpen = async () => {
    setSaving(true);
    try {
      await shiftsApi.open(openingFloat);
      toast.success(t('erp.shifts.opened'));
      setShowOpen(false);
      setOpeningFloat(0);
      void load();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    setSaving(true);
    try {
      const report = await shiftsApi.close(countedCash, closeNotes.trim() || undefined);
      toast.success(t('erp.shifts.closed'));
      setShowClose(false);
      setCountedCash(0);
      setCloseNotes('');
      setPrinting(report);   // yopilishi bilan Z-hisobot chop etishga tayyor
      void load();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const printExisting = async (shiftId: number) => {
    try {
      setPrinting(await shiftsApi.getReport(shiftId));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const columns: Column<CashShift>[] = [
    {
      key: 'openedAt',
      header: t('erp.shifts.openedAt'),
      render: (s) => formatDateTime(s.openedAt),
    },
    { key: 'openedByName', header: t('erp.shifts.cashier'), render: (s) => s.openedByName ?? '—' },
    {
      key: 'closedAt',
      header: t('erp.shifts.closedAt'),
      render: (s) => (s.closedAt ? formatDateTime(s.closedAt) : '—'),
    },
    {
      key: 'expectedCash',
      header: t('erp.shifts.expectedCash'),
      render: (s) => (s.expectedCash != null ? formatCurrency(s.expectedCash) : '—'),
    },
    {
      key: 'difference',
      header: t('erp.shifts.difference'),
      render: (s) =>
        s.difference == null ? (
          '—'
        ) : (
          <span
            className={clsx(
              'font-semibold',
              s.difference < 0 && 'text-error',
              s.difference > 0 && 'text-warning',
              s.difference === 0 && 'text-success'
            )}
          >
            {s.difference === 0 ? formatCurrency(0) : formatCurrency(s.difference)}
          </span>
        ),
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      render: (s) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => printExisting(s.id)}>
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">{t('erp.shifts.title')}</h1>
        <p className="section-subtitle">{t('erp.shifts.subtitle')}</p>
      </div>

      {/* Joriy smena */}
      <div className="surface-card p-6">
        {current ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-success/10 text-success">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">{t('erp.shifts.openSince')}</p>
                <p className="text-sm text-base-content/70">
                  {formatDateTime(current.openedAt)} · {current.openedByName}
                </p>
                <p className="mt-1 text-sm">
                  {t('erp.shifts.openingFloat')}: <strong>{formatCurrency(current.openingFloat)}</strong>
                </p>
              </div>
            </div>
            <PermissionGate permission={PermissionCode.SHIFTS_MANAGE}>
              <Button variant="primary" onClick={() => setShowClose(true)}>
                {t('erp.shifts.close')}
              </Button>
            </PermissionGate>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-base-200 text-base-content/50">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">{t('erp.shifts.noOpenShift')}</p>
                {/* Savdo to'silmaydi, lekin smenasiz savdolar Z-hisobotga tushmaydi */}
                <p className="text-sm text-base-content/60">{t('erp.shifts.noOpenShiftHint')}</p>
              </div>
            </div>
            <PermissionGate permission={PermissionCode.SHIFTS_MANAGE}>
              <Button variant="primary" onClick={() => setShowOpen(true)}>
                {t('erp.shifts.open')}
              </Button>
            </PermissionGate>
          </div>
        )}
      </div>

      {/* Tarix */}
      <DataTable
        data={history}
        columns={columns}
        keyExtractor={(s) => s.id}
        loading={loading}
        error={loadError}
        onRetry={load}
        emptyIcon={<Clock className="h-12 w-12" />}
        emptyTitle={t('erp.shifts.emptyTitle')}
        emptyDescription={t('erp.shifts.emptyDescription')}
      />

      {/* Smena ochish */}
      <ModalPortal isOpen={showOpen} onClose={() => setShowOpen(false)}>
        <div className="w-full max-w-md rounded-2xl bg-base-100 p-6 shadow-2xl">
          <h3 className="text-lg font-semibold">{t('erp.shifts.openTitle')}</h3>
          <p className="mt-1 text-sm text-base-content/60">{t('erp.shifts.openHint')}</p>
          <div className="mt-4">
            <CurrencyInput
              label={t('erp.shifts.openingFloat')}
              value={openingFloat}
              onChange={(v) => setOpeningFloat(Number(v) || 0)}
            />
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={handleOpen} loading={saving}>
              {t('erp.shifts.open')}
            </Button>
          </div>
        </div>
      </ModalPortal>

      {/* Smena yopish */}
      <ModalPortal isOpen={showClose} onClose={() => setShowClose(false)}>
        <div className="w-full max-w-md rounded-2xl bg-base-100 p-6 shadow-2xl">
          <h3 className="text-lg font-semibold">{t('erp.shifts.closeTitle')}</h3>
          {/* Kutilgan summa ATAYLAB ko'rsatilmaydi: kassir pulni mustaqil
              sanashi kerak, aks holda raqamni ko'chirib yozib qo'yishi mumkin. */}
          <p className="mt-1 text-sm text-base-content/60">{t('erp.shifts.closeHint')}</p>
          <div className="mt-4 space-y-3">
            <CurrencyInput
              label={t('erp.shifts.countedCash')}
              value={countedCash}
              onChange={(v) => setCountedCash(Number(v) || 0)}
            />
            <label className="form-control">
              <span className="label-text mb-1">{t('erp.shifts.notes')}</span>
              <input
                className="input input-bordered"
                maxLength={500}
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
              />
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowClose(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={handleClose} loading={saving}>
              {t('erp.shifts.closeAndPrint')}
            </Button>
          </div>
        </div>
      </ModalPortal>

      {/* Natija — farq bo'lsa aniq ko'rsatiladi */}
      {printing && (
        <div
          className={clsx(
            'surface-card flex items-start gap-4 p-6',
            printing.difference && printing.difference !== 0 ? 'border border-warning/40' : ''
          )}
        >
          {printing.difference === 0 ? (
            <CheckCircle2 className="h-6 w-6 shrink-0 text-success" />
          ) : (
            <AlertTriangle className="h-6 w-6 shrink-0 text-warning" />
          )}
          <div className="flex-1">
            <p className="font-semibold">{t('erp.shifts.zReport')}</p>
            <p className="mt-1 text-sm text-base-content/70">
              {t('erp.shifts.expectedCash')}: {formatCurrency(printing.expectedCash)} ·{' '}
              {t('erp.shifts.countedCash')}: {formatCurrency(printing.countedCash ?? 0)}
              {printing.difference != null && printing.difference !== 0 && (
                <>
                  {' · '}
                  <strong className={printing.difference < 0 ? 'text-error' : 'text-warning'}>
                    {printing.difference < 0 ? t('erp.shifts.shortage') : t('erp.shifts.overage')}:{' '}
                    {formatCurrency(Math.abs(printing.difference))}
                  </strong>
                </>
              )}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            {t('erp.receipt.print')}
          </Button>
        </div>
      )}

      {/* Yashirin — faqat chop etishda ko'rinadi (@media print) */}
      {printing && <ZReportPrint report={printing} settings={settings} />}
    </div>
  );
}

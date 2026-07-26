import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { productsApi } from '../../api/products.api';
import { getApiErrorMessage } from '../../utils/apiError';
import { ModalPortal } from '../../components/common/Modal';
import { Button } from '@/ui';
import type { ProductImportResult } from '../../types';

/**
 * Excel import — ikki bosqichli: avval KO'RIB CHIQISH, keyin qo'llash.
 *
 * <p>Server "hammasi yoki hech nima" tamoyilida ishlaydi: bitta qatorda ham
 * xato bo'lsa hech nima yozilmaydi. Shuning uchun ko'rib chiqish bosqichi
 * shunchaki qulaylik emas — u qo'llash muvaffaqiyatli bo'lishini kafolatlaydi.
 */
export function ProductImportModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ProductImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleSelect = async (selected: File | null) => {
    setFile(selected);
    setPreview(null);
    if (!selected) return;

    // Tanlash bilanoq tekshiramiz — foydalanuvchi alohida tugma bosmasin
    setBusy(true);
    try {
      setPreview(await productsApi.importProducts(selected, true));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      reset();
    } finally {
      setBusy(false);
    }
  };

  const handleApply = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const result = await productsApi.importProducts(file, false);
      toast.success(t('erp.import.done', { created: result.created, updated: result.updated }));
      onImported();
      close();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const hasErrors = (preview?.errors.length ?? 0) > 0;

  return (
    <ModalPortal isOpen={open} onClose={close}>
      <div className="w-full max-w-2xl rounded-2xl bg-base-100 p-6 shadow-2xl">
        <h3 className="text-lg font-semibold">{t('erp.import.title')}</h3>
        <p className="mt-1 text-sm text-base-content/60">{t('erp.import.hint')}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="file-input file-input-bordered flex-1"
            onChange={(e) => handleSelect(e.target.files?.[0] ?? null)}
          />
          <Button variant="ghost" onClick={() => productsApi.downloadImportTemplate()}>
            <Download className="mr-2 h-4 w-4" />
            {t('erp.import.template')}
          </Button>
        </div>

        {busy && !preview && (
          <div className="mt-6 flex items-center justify-center gap-3 py-6">
            <span className="loading loading-spinner" />
            <span className="text-sm text-base-content/70">{t('erp.import.checking')}</span>
          </div>
        )}

        {preview && (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Stat label={t('erp.import.rows')} value={preview.totalRows} />
              <Stat label={t('erp.import.created')} value={preview.created} tone="success" />
              <Stat label={t('erp.import.updated')} value={preview.updated} tone="warning" />
            </div>

            {hasErrors ? (
              <div className="rounded-xl border border-error/40 bg-error/5 p-4">
                <div className="flex items-center gap-2 font-semibold text-error">
                  <AlertTriangle className="h-5 w-5" />
                  {t('erp.import.errorsFound', { count: preview.errors.length })}
                </div>
                {/* Server hech nima yozmagan — buni aniq aytamiz, aks holda
                    foydalanuvchi qisman import bo'ldi deb o'ylardi. */}
                <p className="mt-1 text-sm text-base-content/70">{t('erp.import.nothingWritten')}</p>
                <div className="mt-3 max-h-60 overflow-auto rounded-lg bg-base-100">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>{t('erp.import.row')}</th>
                        <th>SKU</th>
                        <th>{t('common.error')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.errors.map((e, i) => (
                        <tr key={`${e.row}-${i}`}>
                          <td className="font-mono">{e.row}</td>
                          <td className="font-mono">{e.sku || '—'}</td>
                          <td>{e.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-success/40 bg-success/5 p-4 text-success">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">{t('erp.import.readyToApply')}</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={close}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleApply}
            loading={busy && !!preview}
            disabled={!preview || hasErrors || busy}
          >
            <Upload className="mr-2 h-4 w-4" />
            {t('erp.import.apply')}
          </Button>
        </div>
      </div>
    </ModalPortal>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'warning' }) {
  return (
    <div className="surface-soft rounded-xl p-3 text-center">
      <div className="flex items-center justify-center gap-1 text-xs text-base-content/60">
        <FileSpreadsheet className="h-3.5 w-3.5" />
        {label}
      </div>
      <div
        className={
          tone === 'success'
            ? 'mt-1 text-xl font-bold text-success'
            : tone === 'warning'
              ? 'mt-1 text-xl font-bold text-warning'
              : 'mt-1 text-xl font-bold'
        }
      >
        {value}
      </div>
    </div>
  );
}

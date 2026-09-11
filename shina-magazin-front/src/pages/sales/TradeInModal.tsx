import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Recycle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/ui';
import { ModalPortal } from '../../components/common/Modal';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { formatCurrency } from '../../config/constants';
import { suggestResalePrice, usedTireSku } from '../../shared/tradeIn';
import type { TradeInLine } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (line: Omit<TradeInLine, 'key'>) => void;
}

/**
 * Barter — eski shinani qabul qilish oynasi.
 *
 * <p>Kassir faqat o'lcham, holat, soni va kreditni kiritadi. Mahsulot
 * kartochkasi (B/U) serverda o'lcham bo'yicha topiladi yoki yaratiladi;
 * bir o'lchamdagi barcha eski shinalar bitta kartochkada yig'iladi.
 */
export function TradeInModal({ isOpen, onClose, onAdd }: Props) {
  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <TradeInForm onClose={onClose} onAdd={onAdd} />
    </ModalPortal>
  );
}

function TradeInForm({ onClose, onAdd }: Omit<Props, 'isOpen'>) {
  const { t } = useTranslation();
  const [width, setWidth] = useState('');
  const [profile, setProfile] = useState('');
  const [diameter, setDiameter] = useState('');
  const [brandName, setBrandName] = useState('');
  const [condition, setCondition] = useState('');
  const [quantity, setQuantity] = useState(4);
  const [unitValue, setUnitValue] = useState(0);
  const [resalePrice, setResalePrice] = useState(0);
  const [resaleTouched, setResaleTouched] = useState(false);

  const size = useMemo(() => {
    const w = Number(width);
    const p = Number(profile);
    const d = Number(diameter);
    const ok = w >= 100 && w <= 999 && p >= 20 && p <= 100 && d >= 10 && d <= 30;
    return ok ? { w, p, d } : null;
  }, [width, profile, diameter]);

  const total = quantity * unitValue;

  const handleUnitValue = (value: number) => {
    const next = Math.max(0, value);
    setUnitValue(next);
    // Sotish narxi taklifi kassir uni o'zi o'zgartirmaguncha kreditga ergashadi
    if (!resaleTouched) setResalePrice(suggestResalePrice(next));
  };

  const handleSubmit = () => {
    if (!size) {
      toast.error(t('erp.pos.tradeInSizeRequired'));
      return;
    }
    onAdd({
      width: size.w,
      profile: size.p,
      diameter: size.d,
      brandName: brandName.trim() || undefined,
      condition: condition.trim() || undefined,
      quantity: Math.max(1, quantity),
      unitValue,
      resalePrice: resalePrice > 0 ? resalePrice : undefined,
    });
    onClose();
  };

  const labelClass =
    'label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50';
  const sizeInputClass = 'input input-bordered w-full text-center tabular-nums';

  return (
    <div className="w-full max-w-lg rounded-2xl bg-base-100 p-4 shadow-2xl sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Recycle className="h-5 w-5 text-primary" />
            {t('erp.pos.tradeInTitle')}
          </h3>
          <p className="mt-1 text-sm text-base-content/60">{t('erp.pos.tradeInSubtitle')}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('common.cancel')}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <label className="form-control">
            <span className={labelClass}>{t('erp.pos.tradeInWidth')}</span>
            <input
              type="number"
              inputMode="numeric"
              min={100}
              max={999}
              placeholder="205"
              className={sizeInputClass}
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              aria-label={t('erp.pos.tradeInWidth')}
            />
          </label>
          <label className="form-control">
            <span className={labelClass}>{t('erp.pos.tradeInProfile')}</span>
            <input
              type="number"
              inputMode="numeric"
              min={20}
              max={100}
              placeholder="55"
              className={sizeInputClass}
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              aria-label={t('erp.pos.tradeInProfile')}
            />
          </label>
          <label className="form-control">
            <span className={labelClass}>{t('erp.pos.tradeInDiameter')}</span>
            <input
              type="number"
              inputMode="numeric"
              min={10}
              max={30}
              placeholder="16"
              className={sizeInputClass}
              value={diameter}
              onChange={(e) => setDiameter(e.target.value)}
              aria-label={t('erp.pos.tradeInDiameter')}
            />
          </label>
        </div>

        {size && (
          <p className="text-xs text-base-content/60">
            {t('erp.pos.tradeInSku', { sku: usedTireSku(size.w, size.p, size.d, brandName) })}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="form-control">
            <span className={labelClass}>{t('erp.pos.tradeInBrand')}</span>
            <input
              type="text"
              className="input input-bordered w-full"
              maxLength={100}
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              aria-label={t('erp.pos.tradeInBrand')}
            />
          </label>
          <label className="form-control">
            <span className={labelClass}>{t('erp.pos.tradeInCondition')}</span>
            <input
              type="text"
              className="input input-bordered w-full"
              maxLength={200}
              placeholder={t('erp.pos.tradeInConditionPh')}
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              aria-label={t('erp.pos.tradeInCondition')}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[110px_minmax(0,1fr)]">
          <label className="form-control">
            <span className={labelClass}>{t('erp.pos.tradeInQuantity')}</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              className={sizeInputClass}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              aria-label={t('erp.pos.tradeInQuantity')}
            />
          </label>
          <CurrencyInput
            label={t('erp.pos.tradeInUnitValue')}
            value={unitValue}
            onChange={handleUnitValue}
            min={0}
            showQuickButtons
          />
        </div>

        <CurrencyInput
          label={t('erp.pos.tradeInResale')}
          value={resalePrice}
          onChange={(value) => {
            setResaleTouched(true);
            setResalePrice(Math.max(0, value));
          }}
          min={0}
        />

        <div className="flex items-center justify-between rounded-xl bg-base-200 px-4 py-3">
          <span className="font-medium">{t('erp.pos.tradeInTotal')}</span>
          <span className="text-lg font-semibold tabular-nums">{formatCurrency(total)}</span>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!size || unitValue <= 0}>
          {t('erp.pos.tradeInSubmit')}
        </Button>
      </div>
    </div>
  );
}

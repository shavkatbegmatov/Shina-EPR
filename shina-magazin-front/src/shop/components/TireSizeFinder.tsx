import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Card, Button, cn } from '@/ui';
import { useCatalogProducts } from '../data/useCatalog';

/**
 * Shina o'lchami qidiruvchisi — eni / balandligi / diametri bo'yicha (mas. 205/55 R16).
 * Shina do'koni uchun asosiy qidiruv usuli. Tanlovlar katalogga URL parametr
 * sifatida uzatiladi (?width=&profile=&diameter=).
 */
export function TireSizeFinder({ className }: { className?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { products } = useCatalogProducts();

  const [width, setWidth] = useState('');
  const [profile, setProfile] = useState('');
  const [diameter, setDiameter] = useState('');

  const uniqSorted = (vals: (number | undefined)[]) =>
    [...new Set(vals.filter((v): v is number => v != null))].sort((a, b) => a - b);
  const widths = uniqSorted(products.map((p) => p.width));
  const profiles = uniqSorted(products.map((p) => p.profile));
  const diameters = uniqSorted(products.map((p) => p.diameter));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (width) params.set('width', width);
    if (profile) params.set('profile', profile);
    if (diameter) params.set('diameter', diameter);
    const qs = params.toString();
    navigate(`/katalog${qs ? `?${qs}` : ''}`);
  };

  const selectClass = 'h-12 w-full rounded-xl border border-base-300 bg-base-100 px-3 text-sm outline-none transition focus:border-primary';

  return (
    <Card className={cn('p-5', className)}>
      <div className="mb-3 flex items-center gap-2">
        <Search size={18} className="text-primary" />
        <h2 className="font-semibold">{t('shop.finder.title')}</h2>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="mb-1 block text-xs font-medium text-base-content/60">{t('shop.finder.width')}</span>
          <select value={width} onChange={(e) => setWidth(e.target.value)} className={selectClass} aria-label={t('shop.finder.width')}>
            <option value="">{t('shop.finder.any')}</option>
            {widths.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </label>
        <span className="hidden pb-3 text-base-content/30 sm:block">/</span>
        <label className="flex-1">
          <span className="mb-1 block text-xs font-medium text-base-content/60">{t('shop.finder.profile')}</span>
          <select value={profile} onChange={(e) => setProfile(e.target.value)} className={selectClass} aria-label={t('shop.finder.profile')}>
            <option value="">{t('shop.finder.any')}</option>
            {profiles.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <span className="hidden pb-3 font-semibold text-base-content/30 sm:block">R</span>
        <label className="flex-1">
          <span className="mb-1 block text-xs font-medium text-base-content/60">{t('shop.finder.diameter')}</span>
          <select value={diameter} onChange={(e) => setDiameter(e.target.value)} className={selectClass} aria-label={t('shop.finder.diameter')}>
            <option value="">{t('shop.finder.any')}</option>
            {diameters.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <Button type="submit" size="md" className="h-12 gap-2 sm:w-auto">
          <Search size={16} /> {t('shop.finder.find')}
        </Button>
      </form>
    </Card>
  );
}

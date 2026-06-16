import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, X } from 'lucide-react';
import { EmptyState, Button } from '@/ui';
import type { Season } from '../../types';
import { ProductCard } from '../components/ProductCard';
import { useCatalogProducts, useCatalogBrands } from '../data/useCatalog';

type SortKey = 'new' | 'price-asc' | 'price-desc';
const SEASONS: Season[] = ['SUMMER', 'WINTER', 'ALL_SEASON'];

export function CatalogPage() {
  const { t } = useTranslation();
  const { products } = useCatalogProducts();
  const brands = useCatalogBrands();
  const [searchParams, setSearchParams] = useSearchParams();

  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [brand, setBrand] = useState(searchParams.get('brand') ?? '');
  const [season, setSeason] = useState<string>(searchParams.get('season') ?? '');
  const [sort, setSort] = useState<SortKey>('new');

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = products.filter((p) => {
      if (brand && p.brandName !== brand) return false;
      if (season && p.season !== season) return false;
      if (needle) {
        const hay = `${p.name} ${p.sku} ${p.brandName ?? ''} ${p.sizeString ?? ''}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === 'price-asc') return a.sellingPrice - b.sellingPrice;
      if (sort === 'price-desc') return b.sellingPrice - a.sellingPrice;
      return b.id - a.id;
    });
    return list;
  }, [products, q, brand, season, sort]);

  const hasFilters = Boolean(q || brand || season);

  const clearFilters = () => {
    setQ(''); setBrand(''); setSeason(''); setSort('new');
    setSearchParams({}, { replace: true });
  };

  const selectClass = 'h-11 rounded-xl border border-base-300 bg-base-100 px-3 text-sm outline-none transition focus:border-primary';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-2 flex items-center gap-2 text-base-content/60">
        <SlidersHorizontal size={18} />
        <h1 className="section-title text-base-content">{t('shop.nav.catalog')}</h1>
      </div>
      <p className="mb-6 text-sm text-base-content/60">
        {t('shop.catalog.results', { count: results.length })}
      </p>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('shop.search.placeholder')}
          aria-label={t('shop.search.placeholder')}
          className={selectClass + ' min-w-[12rem] flex-1'}
        />
        <select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label={t('shop.catalog.brand')} className={selectClass}>
          <option value="">{t('shop.catalog.allBrands')}</option>
          {brands.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={season} onChange={(e) => setSeason(e.target.value)} aria-label={t('shop.catalog.season')} className={selectClass}>
          <option value="">{t('shop.catalog.allSeasons')}</option>
          {SEASONS.map((s) => <option key={s} value={s}>{t(`shop.season.${s}`)}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label={t('shop.catalog.sortBy')} className={selectClass}>
          <option value="new">{t('shop.catalog.sortNew')}</option>
          <option value="price-asc">{t('shop.catalog.sortPriceAsc')}</option>
          <option value="price-desc">{t('shop.catalog.sortPriceDesc')}</option>
        </select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X size={15} /> {t('shop.catalog.clear')}
          </Button>
        )}
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <EmptyState
          icon={SlidersHorizontal}
          title={t('shop.catalog.empty')}
          description={t('shop.catalog.emptyHint')}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {results.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}

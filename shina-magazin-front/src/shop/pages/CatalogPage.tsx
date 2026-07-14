import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, X } from 'lucide-react';
import { EmptyState, Button, Skeleton } from '@/ui';
import type { Product, Season } from '../../types';
import { ProductCard } from '../components/ProductCard';
import { TireSizeFinder } from '../components/TireSizeFinder';
import { CatalogFilterPanel } from '../components/CatalogFilterPanel';
import {
  useCatalogProducts,
  useCatalogBrands,
  useCatalogFacets,
  useFilteredCatalog,
} from '../data/useCatalog';

type SortKey = 'new' | 'price-asc' | 'price-desc';
const SEASONS: Season[] = ['SUMMER', 'WINTER', 'ALL_SEASON'];

// Pageable sort — server tomonda saralash
const SORT_TO_SERVER: Record<SortKey, string> = {
  new: 'id,desc',
  'price-asc': 'sellingPrice,asc',
  'price-desc': 'sellingPrice,desc',
};

// attrs URL parametri backend formati bilan bir xil: "1:3,4;7:9"
function parseAttrs(raw: string | null): Record<number, number[]> {
  const map: Record<number, number[]> = {};
  if (!raw) return map;
  for (const group of raw.split(';')) {
    const [attr, opts] = group.split(':');
    const attrId = Number(attr);
    if (!attrId || !opts) continue;
    const ids = opts.split(',').map(Number).filter(Boolean);
    if (ids.length) map[attrId] = ids;
  }
  return map;
}

function serializeAttrs(map: Record<number, number[]>): string {
  return Object.entries(map)
    .filter(([, ids]) => ids.length > 0)
    .map(([attrId, ids]) => `${attrId}:${ids.join(',')}`)
    .join(';');
}

export function CatalogPage() {
  const { t } = useTranslation();
  const brands = useCatalogBrands();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [brand, setBrand] = useState(searchParams.get('brand') ?? '');
  const [season, setSeason] = useState<string>(searchParams.get('season') ?? '');
  const [sort, setSort] = useState<SortKey>('new');

  // O'lcham filtri qidiruvchidan URL orqali keladi (jonli o'qiladi)
  const width = searchParams.get('width') ?? '';
  const profile = searchParams.get('profile') ?? '';
  const diameter = searchParams.get('diameter') ?? '';

  // WB-uslub panel filtrlari — URL'da (ulashiladigan havolalar uchun)
  const categoryId = searchParams.get('cat') ? Number(searchParams.get('cat')) : undefined;
  const priceMin = searchParams.get('pmin') ? Number(searchParams.get('pmin')) : undefined;
  const priceMax = searchParams.get('pmax') ? Number(searchParams.get('pmax')) : undefined;
  const inStock = searchParams.get('stock') === '1';
  const attrsParam = searchParams.get('attrs') ?? '';
  const attrsMap = useMemo(() => parseAttrs(attrsParam), [attrsParam]);

  // Facetlar va server tomonda filtrlangan ro'yxat. Backend bo'lmasa facets
  // undefined qoladi va mahsulotlar demo ro'yxatdan client-side filtrlaniladi.
  const { facets } = useCatalogFacets(categoryId);
  const serverParams = useMemo(
    () => ({
      categoryId,
      season: (season || undefined) as Season | undefined,
      priceMin,
      priceMax,
      inStock: inStock || undefined,
      attrs: attrsParam || undefined,
      sort: SORT_TO_SERVER[sort],
    }),
    [categoryId, season, priceMin, priceMax, inStock, attrsParam, sort]
  );
  const { products: serverProducts, isLoading: serverLoading, serverMode } = useFilteredCatalog(serverParams);
  const { products: allProducts } = useCatalogProducts();

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const matchBasics = (p: Product) => {
      if (brand && p.brandName !== brand) return false;
      if (width && p.width !== Number(width)) return false;
      if (profile && p.profile !== Number(profile)) return false;
      if (diameter && p.diameter !== Number(diameter)) return false;
      if (needle) {
        const hay = `${p.name} ${p.sku} ${p.brandName ?? ''} ${p.sizeString ?? ''}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    };

    if (serverMode) {
      // Server: kategoriya shajarasi, narx, mavjudlik, atributlar, mavsum, saralash.
      // Client: tez filtrlar (qidiruv, brend nomi, shina o'lchami).
      return (serverProducts ?? []).filter(matchBasics);
    }

    // Fallback (backend yo'q): eski to'liq client-side yo'l — demo rejim ishlayveradi
    const list = allProducts.filter((p) => {
      if (!matchBasics(p)) return false;
      if (season && p.season !== season) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      if (sort === 'price-asc') return a.sellingPrice - b.sellingPrice;
      if (sort === 'price-desc') return b.sellingPrice - a.sellingPrice;
      return b.id - a.id;
    });
  }, [serverMode, serverProducts, allProducts, q, brand, season, sort, width, profile, diameter]);

  const showSkeleton = serverMode && serverLoading && !serverProducts;

  const hasSize = Boolean(width || profile || diameter);
  const panelActiveCount =
    (categoryId ? 1 : 0) +
    (priceMin !== undefined || priceMax !== undefined ? 1 : 0) +
    (inStock ? 1 : 0) +
    Object.keys(attrsMap).length;
  const hasFilters = Boolean(q || brand || season) || hasSize || panelActiveCount > 0;

  // ─── URL param yordamchilari ───

  const updateParams = (mutate: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams);
    mutate(next);
    setSearchParams(next, { replace: true });
  };

  const handleCategoryChange = (id?: number) => {
    updateParams((next) => {
      if (id) next.set('cat', String(id));
      else next.delete('cat');
      next.delete('attrs'); // kategoriya almashsa atribut tanlovlari eskiradi
    });
  };

  const handlePriceChange = (min?: number, max?: number) => {
    updateParams((next) => {
      if (min !== undefined) next.set('pmin', String(min));
      else next.delete('pmin');
      if (max !== undefined) next.set('pmax', String(max));
      else next.delete('pmax');
    });
  };

  const handleInStockChange = (value: boolean) => {
    updateParams((next) => {
      if (value) next.set('stock', '1');
      else next.delete('stock');
    });
  };

  const handleToggleOption = (attrId: number, optionId: number) => {
    const next = { ...attrsMap };
    const current = new Set(next[attrId] ?? []);
    if (current.has(optionId)) current.delete(optionId);
    else current.add(optionId);
    if (current.size) next[attrId] = [...current];
    else delete next[attrId];
    updateParams((params) => {
      const serialized = serializeAttrs(next);
      if (serialized) params.set('attrs', serialized);
      else params.delete('attrs');
    });
  };

  const clearFilters = () => {
    setQ('');
    setBrand('');
    setSeason('');
    setSort('new');
    setSearchParams({}, { replace: true });
  };

  const clearSize = () => {
    updateParams((next) => {
      next.delete('width');
      next.delete('profile');
      next.delete('diameter');
    });
  };

  const selectClass =
    'h-11 rounded-xl border border-base-300 bg-base-100 px-3 text-sm outline-none transition focus:border-primary';

  const filterPanel = (
    <CatalogFilterPanel
      facets={facets}
      categoryId={categoryId}
      onCategoryChange={(id) => {
        handleCategoryChange(id);
        setFiltersOpen(false);
      }}
      priceMin={priceMin}
      priceMax={priceMax}
      onPriceChange={handlePriceChange}
      inStock={inStock}
      onInStockChange={handleInStockChange}
      selectedOptions={attrsMap}
      onToggleOption={handleToggleOption}
      hasActiveFilters={panelActiveCount > 0}
      onClearAll={() =>
        updateParams((next) => {
          next.delete('cat');
          next.delete('pmin');
          next.delete('pmax');
          next.delete('stock');
          next.delete('attrs');
        })
      }
    />
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-2 flex items-center gap-2 text-base-content/60">
        <SlidersHorizontal size={18} />
        <h1 className="section-title text-base-content">{t('shop.nav.catalog')}</h1>
      </div>
      <p className="mb-6 text-sm text-base-content/60">
        {t('shop.catalog.results', { count: results.length })}
      </p>

      <TireSizeFinder className="mb-6" />

      {/* Tezkor filtrlar qatori */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Mobil: filtr paneli tugmasi */}
        {facets && (
          <Button
            variant="outline"
            className="gap-1.5 lg:hidden"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal size={15} />
            {t('shop.catalog.filtersTitle')}
            {panelActiveCount > 0 && (
              <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-xs font-bold text-primary-content">
                {panelActiveCount}
              </span>
            )}
          </Button>
        )}
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
        {hasSize && (
          <span className="pill gap-1.5 font-mono">
            {width || '…'}/{profile || '…'} R{diameter || '…'}
            <button type="button" onClick={clearSize} aria-label={t('shop.catalog.clear')} className="hover:text-error"><X size={12} /></button>
          </span>
        )}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X size={15} /> {t('shop.catalog.clear')}
          </Button>
        )}
      </div>

      {/* Panel + natijalar */}
      <div className="lg:grid lg:grid-cols-[270px_minmax(0,1fr)] lg:items-start lg:gap-6">
        {/* Desktop filtr paneli */}
        {facets && (
          <aside className="sticky top-24 hidden max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-base-300/60 bg-base-100 p-4 lg:block">
            {filterPanel}
          </aside>
        )}

        <section className={facets ? '' : 'lg:col-span-2'}>
          {showSkeleton ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] w-full rounded-2xl" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <EmptyState
              icon={SlidersHorizontal}
              title={t('shop.catalog.empty')}
              description={t('shop.catalog.emptyHint')}
            />
          ) : (
            <div className={`grid grid-cols-2 gap-4 md:grid-cols-3 ${facets ? '' : 'lg:grid-cols-4'}`}>
              {results.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </section>
      </div>

      {/* Mobil filtr drawer */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setFiltersOpen(false)}
            role="button"
            aria-label={t('shop.catalog.closeFilters')}
          />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] overflow-y-auto bg-base-100 p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">{t('shop.catalog.filtersTitle')}</h2>
              <Button variant="ghost" size="sm" onClick={() => setFiltersOpen(false)} aria-label={t('shop.catalog.closeFilters')}>
                <X size={16} />
              </Button>
            </div>
            {filterPanel}
          </div>
        </div>
      )}
    </div>
  );
}

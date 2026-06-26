import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { cn } from '@/ui';
import { formatCurrency } from '../../config/constants';
import { useCatalogProducts } from '../data/useCatalog';
import { ProductImage } from './ProductImage';

interface ShopSearchBoxProps {
  className?: string;
  /** tanlovdan/yuborishdan keyin chaqiriladi (mas. mobil menyuni yopish) */
  onNavigate?: () => void;
}

/**
 * Storefront qidiruv qutisi — jonli takliflar (autocomplete).
 * Kamida 2 belgi: nom/SKU/brend/o'lcham bo'yicha mos mahsulotlar dropdown'da.
 * Enter / "Barcha natijalar" → katalog (?q=); taklif bosilsa → mahsulot sahifasi.
 */
export function ShopSearchBox({ className, onNavigate }: ShopSearchBoxProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { products } = useCatalogProducts();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();
  const suggestions =
    q.length >= 2
      ? products
          .filter((p) =>
            `${p.name} ${p.sku} ${p.brandName ?? ''} ${p.sizeString ?? ''}`.toLowerCase().includes(q)
          )
          .slice(0, 6)
      : [];

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const submitSearch = () => {
    navigate(`/katalog${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`);
    setOpen(false);
    onNavigate?.();
  };

  const goProduct = (id: number) => {
    navigate(`/mahsulot/${id}`);
    setOpen(false);
    setQuery('');
    onNavigate?.();
  };

  return (
    <div ref={ref} className={cn('relative', className)}>
      <form onSubmit={(e) => { e.preventDefault(); submitSearch(); }}>
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={t('shop.search.placeholder')}
          aria-label={t('shop.search.placeholder')}
          className="h-10 w-full rounded-xl border border-base-300 bg-base-100 pl-9 pr-3 text-sm outline-none transition focus:border-primary"
        />
      </form>

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-base-200 bg-base-100 shadow-strong">
          <ul className="max-h-80 overflow-y-auto py-1">
            {suggestions.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => goProduct(p.id)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-base-200"
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-base-200">
                    <ProductImage src={p.imageUrl} alt={p.name} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="font-mono text-xs text-base-content/50">{p.sizeString}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-primary">{formatCurrency(p.sellingPrice)}</span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={submitSearch}
            className="block w-full border-t border-base-200 px-3 py-2 text-center text-xs font-medium text-primary transition-colors hover:bg-base-200"
          >
            {t('shop.search.allResults')}
          </button>
        </div>
      )}
    </div>
  );
}

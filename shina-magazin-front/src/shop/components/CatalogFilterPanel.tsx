import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, X } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/ui';
import type { CatalogFacets, Category } from '../../types';

export interface CatalogFilterPanelProps {
  facets?: CatalogFacets;
  categoryId?: number;
  onCategoryChange: (id?: number) => void;
  priceMin?: number;
  priceMax?: number;
  onPriceChange: (min?: number, max?: number) => void;
  inStock: boolean;
  onInStockChange: (value: boolean) => void;
  /** attrId -> tanlangan variant idlari */
  selectedOptions: Record<number, number[]>;
  onToggleOption: (attrId: number, optionId: number) => void;
  hasActiveFilters: boolean;
  onClearAll: () => void;
}

/** Kategoriya + barcha bolalari bo'yicha jami mahsulot soni (root'larda o'zi 0 bo'ladi). */
function subtreeCount(node: Category): number {
  const own = node.productCount ?? 0;
  return own + (node.children ?? []).reduce((sum, child) => sum + subtreeCount(child), 0);
}

/**
 * WB-uslub filtr paneli: kategoriya daraxti, narx diapazoni, mavjudlik va
 * tanlangan kategoriyaning atribut facetlari (variant hisoblagichlari bilan).
 * Desktopda chap ustun, mobilda drawer ichida ishlatiladi.
 */
export function CatalogFilterPanel({
  facets,
  categoryId,
  onCategoryChange,
  priceMin,
  priceMax,
  onPriceChange,
  inStock,
  onInStockChange,
  selectedOptions,
  onToggleOption,
  hasActiveFilters,
  onClearAll,
}: CatalogFilterPanelProps) {
  const { t } = useTranslation();

  // Narx inputlari — qoralama (draft): blur/Enter'da qo'llanadi
  const [minDraft, setMinDraft] = useState(priceMin?.toString() ?? '');
  const [maxDraft, setMaxDraft] = useState(priceMax?.toString() ?? '');
  useEffect(() => setMinDraft(priceMin?.toString() ?? ''), [priceMin]);
  useEffect(() => setMaxDraft(priceMax?.toString() ?? ''), [priceMax]);

  const commitPrice = () => {
    const min = minDraft.trim() === '' ? undefined : Math.max(0, Number(minDraft));
    const max = maxDraft.trim() === '' ? undefined : Math.max(0, Number(maxDraft));
    onPriceChange(
      Number.isNaN(min as number) ? undefined : min,
      Number.isNaN(max as number) ? undefined : max
    );
  };

  const renderCategory = (node: Category, depth: number) => {
    const count = subtreeCount(node);
    const isActive = categoryId === node.id;
    return (
      <li key={node.id}>
        <button
          type="button"
          onClick={() => onCategoryChange(isActive ? undefined : node.id)}
          aria-pressed={isActive}
          className={clsx(
            'flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition',
            isActive
              ? 'bg-primary/10 font-semibold text-primary'
              : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'
          )}
          style={{ paddingLeft: 8 + depth * 14 }}
        >
          <span className="flex min-w-0 items-center gap-1">
            {depth > 0 && <ChevronRight size={12} className="shrink-0 text-base-content/30" />}
            <span className="truncate">{node.name}</span>
          </span>
          {count > 0 && (
            <span className={clsx('shrink-0 text-xs', isActive ? 'text-primary/70' : 'text-base-content/40')}>
              {count}
            </span>
          )}
        </button>
        {node.children && node.children.length > 0 && (
          <ul>{node.children.map((child) => renderCategory(child, depth + 1))}</ul>
        )}
      </li>
    );
  };

  const inputClass =
    'h-10 w-full rounded-lg border border-base-300 bg-base-100 px-2.5 text-sm outline-none transition focus:border-primary';

  return (
    <div className="space-y-5">
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClearAll} className="w-full justify-start gap-1 text-error">
          <X size={14} /> {t('shop.catalog.clearAll')}
        </Button>
      )}

      {/* Kategoriyalar daraxti */}
      {facets && facets.categories.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-base-content/50">
            {t('shop.catalog.categoriesTitle')}
          </h3>
          <ul className="space-y-0.5">
            <li>
              <button
                type="button"
                onClick={() => onCategoryChange(undefined)}
                aria-pressed={!categoryId}
                className={clsx(
                  'w-full rounded-lg px-2 py-1.5 text-left text-sm transition',
                  !categoryId
                    ? 'bg-primary/10 font-semibold text-primary'
                    : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'
                )}
              >
                {t('shop.catalog.allCategories')}
              </button>
            </li>
            {facets.categories.map((node) => renderCategory(node, 0))}
          </ul>
        </section>
      )}

      {/* Narx diapazoni */}
      {facets && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-base-content/50">
            {t('shop.catalog.priceTitle')}
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              value={minDraft}
              min={0}
              onChange={(e) => setMinDraft(e.target.value)}
              onBlur={commitPrice}
              onKeyDown={(e) => e.key === 'Enter' && commitPrice()}
              placeholder={facets.priceMin != null ? String(facets.priceMin) : t('shop.catalog.priceFrom')}
              aria-label={t('shop.catalog.priceFrom')}
              className={inputClass}
            />
            <span className="text-base-content/40">—</span>
            <input
              type="number"
              inputMode="numeric"
              value={maxDraft}
              min={0}
              onChange={(e) => setMaxDraft(e.target.value)}
              onBlur={commitPrice}
              onKeyDown={(e) => e.key === 'Enter' && commitPrice()}
              placeholder={facets.priceMax != null ? String(facets.priceMax) : t('shop.catalog.priceTo')}
              aria-label={t('shop.catalog.priceTo')}
              className={inputClass}
            />
          </div>
        </section>
      )}

      {/* Mavjudlik */}
      <section>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-base-content/80">
          <input
            type="checkbox"
            className="toggle toggle-primary toggle-sm"
            checked={inStock}
            onChange={(e) => onInStockChange(e.target.checked)}
          />
          {t('shop.catalog.inStockOnly')}
        </label>
      </section>

      {/* Atribut facetlari (tanlangan kategoriya bo'yicha, meros bilan) */}
      {facets?.attributes.map((attr) => {
        const selected = new Set(selectedOptions[attr.id] ?? []);
        return (
          <section key={attr.id}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-base-content/50">
              {attr.name}
              {attr.unit ? ` (${attr.unit})` : ''}
            </h3>
            <ul className="space-y-1">
              {attr.options.map((option) => (
                <li key={option.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-sm text-base-content/80 transition hover:bg-base-200">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary checkbox-xs"
                      checked={selected.has(option.id)}
                      onChange={() => onToggleOption(attr.id, option.id)}
                    />
                    <span className="min-w-0 flex-1 truncate">{option.value}</span>
                    <span className="shrink-0 text-xs text-base-content/40">{option.count}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

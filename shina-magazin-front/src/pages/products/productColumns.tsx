import type { TFunction } from 'i18next';
import clsx from 'clsx';
import { formatCurrency } from '../../config/constants';
import { enumLabel } from '@/shared/enumLabel';
import { type Column } from '../../components/ui/DataTable';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import { Button } from '@/ui';
import type { Product } from '../../types';

interface ColumnActions {
  onShowDetails: (product: Product) => void;
  onEdit: (product: Product) => void;
}

/**
 * Mahsulot jadvali ustunlari.
 *
 * <p>Shina ustunlari (o'lcham va mavsum) `isTireContext` ga qarab
 * qo'shiladi: universal magazinda shinaga aloqasi yo'q kategoriya
 * tanlansa, bo'sh "—" to'la ikkita ustun ko'rsatish ma'nosiz.
 */
export function buildProductColumns(
  t: TFunction,
  isTireContext: boolean,
  { onShowDetails, onEdit }: ColumnActions
): Column<Product>[] {
  return [
    {
      key: 'sku',
      header: 'SKU',
      render: (product) => <span className="font-mono text-sm">{product.sku}</span>,
    },
    {
      key: 'name',
      header: t('common.name'),
      render: (product) => (
        <div>
          <div className="font-medium">{product.name}</div>
          <div className="text-xs text-base-content/60">{product.categoryName || '—'}</div>
        </div>
      ),
    },
    {
      key: 'brandName',
      header: t('erp.products.colBrand'),
      render: (product) => product.brandName || '—',
    },
    ...(isTireContext
      ? ([
          {
            key: 'sizeString',
            header: t('erp.products.colSize'),
            render: (product) => product.sizeString || '—',
          },
          {
            key: 'season',
            header: t('erp.products.colSeason'),
            render: (product) =>
              product.season ? (
                <span className="badge badge-outline badge-sm">{enumLabel('season', product.season)}</span>
              ) : null,
          },
        ] as Column<Product>[])
      : []),
    {
      key: 'sellingPrice',
      header: t('erp.products.colPrice'),
      render: (product) => <span className="font-medium">{formatCurrency(product.sellingPrice)}</span>,
    },
    {
      key: 'quantity',
      header: t('erp.products.colStock'),
      render: (product) => (
        <span className={clsx('badge badge-sm', product.lowStock ? 'badge-error' : 'badge-success')}>
          {product.quantity}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      render: (product) => (
        <div className="space-x-2">
          {/* `stopPropagation` — qatorning o'z bosilishi tafsilotni ochadi */}
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onShowDetails(product); }}>
            {t('erp.products.details')}
          </Button>
          <PermissionGate permission={PermissionCode.PRODUCTS_UPDATE}>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(product); }}>
              {t('common.edit')}
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ];
}

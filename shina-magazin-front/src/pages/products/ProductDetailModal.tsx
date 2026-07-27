import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, BadgeCheck, Package, X } from 'lucide-react';
import clsx from 'clsx';
import { productsApi } from '../../api/products.api';
import { formatCurrency } from '../../config/constants';
import { enumLabel } from '@/shared/enumLabel';
import { ModalPortal } from '../../components/common/Modal';
import { queryKeys } from '../../lib/queryKeys';
import { Button } from '@/ui';
import { type Product } from '../../types';

interface ProductDetailModalProps {
  /** Ro'yxatdan tanlangan mahsulot. */
  product: Product;
  onClose: () => void;
}

/**
 * Mahsulot tafsiloti oynasi — faqat ko'rish uchun.
 *
 * <p>Ro'yxat javobida atribut QIYMATLARI yo'q, shuning uchun to'liq mahsulot
 * alohida olinadi. So'rov mahsulot ID siga kalitlangan: operator oynani
 * yopib boshqasini ochsa, kechikkan javob yangi tanlov ustiga yozilmaydi —
 * ilgari buni qo'lda tekshirish kerak edi.
 *
 * <p>Ekranda esa darhol ro'yxatdagi ma'lumot ko'rsatiladi va javob kelgach
 * xususiyatlar bilan to'ldiriladi — bo'sh oyna ko'rinmaydi.
 */
export function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
  const { t } = useTranslation();

  const fullProductQuery = useQuery({
    queryKey: queryKeys.products.detail(product.id),
    queryFn: () => productsApi.getById(product.id),
  });

  const shown = fullProductQuery.data ?? product;

  return (
    <ModalPortal isOpen onClose={onClose}>
      <div className="w-full max-w-3xl bg-base-100 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">{shown.name}</h3>
              <p className="text-sm text-base-content/60">SKU: {shown.sku}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
              {t('common.close')}
            </Button>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
            <div className="surface-soft flex h-48 items-center justify-center rounded-xl">
              {shown.imageUrl ? (
                <img src={shown.imageUrl} alt={shown.name} className="h-full w-full rounded-xl object-cover" />
              ) : (
                <Package className="h-12 w-12 text-base-content/40" />
              )}
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/60">
                {shown.brandName && <span className="pill">{shown.brandName}</span>}
                {shown.categoryName && <span className="pill">{shown.categoryName}</span>}
                {shown.season && <span className="pill">{enumLabel('season', shown.season)}</span>}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="surface-soft rounded-lg p-3">
                  <p className="text-xs text-base-content/60">{t('erp.products.colPrice')}</p>
                  <p className="text-lg font-semibold text-primary">{formatCurrency(shown.sellingPrice)}</p>
                </div>
                <div className="surface-soft rounded-lg p-3">
                  <p className="text-xs text-base-content/60">{t('erp.products.colStock')}</p>
                  <div className="flex items-center gap-2">
                    <span className={clsx('badge badge-sm', shown.lowStock ? 'badge-error' : 'badge-success')}>
                      {shown.quantity}
                    </span>
                    {shown.lowStock ? (
                      <span className="flex items-center gap-1 text-xs text-error">
                        <AlertTriangle className="h-4 w-4" />
                        {t('erp.products.lowStock')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-success">
                        <BadgeCheck className="h-4 w-4" />
                        {t('erp.products.inStock')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Shina o'lchamlari — faqat qiymat mavjud bo'lsa (universal mahsulotlarda chiqmaydi) */}
              {(shown.sizeString || shown.speedRating || shown.loadIndex) && (
                <div className="grid grid-cols-2 gap-3 text-sm text-base-content/70">
                  {shown.sizeString && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-base-content/40">{t('erp.products.colSize')}</p>
                      <p className="font-medium">{shown.sizeString}</p>
                    </div>
                  )}
                  {(shown.speedRating || shown.loadIndex) && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-base-content/40">{t('erp.products.speedLoad')}</p>
                      <p className="font-medium">{shown.speedRating || '—'} / {shown.loadIndex || '—'}</p>
                    </div>
                  )}
                </div>
              )}

              {shown.description && (
                <div className="surface-soft rounded-lg p-3 text-sm text-base-content/70">
                  {shown.description}
                </div>
              )}

              {/* Xususiyatlar (atributlar) */}
              {shown.attributes && shown.attributes.length > 0 && (
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-base-content/40">
                    {t('erp.products.characteristics')}
                  </p>
                  <dl className="divide-y divide-base-200 overflow-hidden rounded-lg border border-base-200 text-sm">
                    {shown.attributes.map((attr) => (
                      <div key={attr.attributeId} className="flex items-center justify-between gap-4 px-3 py-2">
                        <dt className="text-base-content/60">{attr.name}</dt>
                        <dd className="text-right font-medium">{attr.values.join(', ') || '—'}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  Tag,
  DollarSign,
  Warehouse,
  Ruler,
  Thermometer,
  Gauge,
  Zap,
  AlertCircle,
  FileText,
} from 'lucide-react';
import clsx from 'clsx';
import { productsApi } from '../../api/products.api';
import { formatCurrency } from '../../config/constants';
import type { Product } from '../../types';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProduct = useCallback(async () => {
    if (!id) return;
    try {
      const data = await productsApi.getById(Number(id));
      setProduct(data);
    } catch (error) {
      console.error('Failed to load product:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  // Season label helper
  const getSeasonLabel = (season?: string) => {
    switch (season) {
      case 'SUMMER':
        return 'Yozgi';
      case 'WINTER':
        return 'Qishki';
      case 'ALL_SEASON':
        return 'Barcha mavsumlar';
      default:
        return '—';
    }
  };

  // Season badge style
  const getSeasonBadgeClass = (season?: string) => {
    switch (season) {
      case 'SUMMER':
        return 'badge-warning';
      case 'WINTER':
        return 'badge-info';
      case 'ALL_SEASON':
        return 'badge-success';
      default:
        return 'badge-ghost';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-32 w-full" />
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-error mb-4" />
        <h2 className="text-xl font-semibold">Mahsulot topilmadi</h2>
        <button className="btn btn-primary mt-4" onClick={() => navigate('/products')}>
          Orqaga qaytish
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/products')}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="section-title flex items-center gap-2">
              <Package className="h-6 w-6" />
              {product.name}
            </h1>
            <p className="section-subtitle font-mono">{product.sku}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={clsx('badge', product.active ? 'badge-success' : 'badge-error')}>
            {product.active ? 'Faol' : 'Nofaol'}
          </span>
          {product.lowStock && (
            <span className="badge badge-warning">Kam qoldi</span>
          )}
          {product.season && (
            <span className={clsx('badge', getSeasonBadgeClass(product.season))}>
              {getSeasonLabel(product.season)}
            </span>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Tag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Brand</p>
              <p className="font-semibold">{product.brandName || '—'}</p>
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-info/10 p-2.5">
              <Package className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Kategoriya</p>
              <p className="font-semibold">{product.categoryName || '—'}</p>
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2.5">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Sotish narxi</p>
              <p className="font-semibold">{formatCurrency(product.sellingPrice)}</p>
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-warning/10 p-2.5">
              <Warehouse className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Ombor qoldig'i</p>
              <p className={clsx(
                'font-semibold',
                product.lowStock ? 'text-error' : 'text-success'
              )}>
                {product.quantity} dona
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Technical Specifications */}
        <div className="surface-card p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4">
            Texnik xususiyatlari
          </h3>
          <div className="space-y-4">
            {/* Size */}
            {product.sizeString && (
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-base-200 p-2">
                  <Ruler className="h-4 w-4 text-base-content/60" />
                </div>
                <div>
                  <p className="text-xs text-base-content/60">O'lchami</p>
                  <p className="font-semibold">{product.sizeString}</p>
                </div>
              </div>
            )}

            {/* Dimensions breakdown */}
            {(product.width || product.profile || product.diameter) && (
              <div className="grid grid-cols-3 gap-4 pl-11">
                {product.width && (
                  <div>
                    <p className="text-xs text-base-content/60">Kengligi</p>
                    <p className="font-medium">{product.width} mm</p>
                  </div>
                )}
                {product.profile && (
                  <div>
                    <p className="text-xs text-base-content/60">Profil</p>
                    <p className="font-medium">{product.profile}%</p>
                  </div>
                )}
                {product.diameter && (
                  <div>
                    <p className="text-xs text-base-content/60">Diametr</p>
                    <p className="font-medium">R{product.diameter}</p>
                  </div>
                )}
              </div>
            )}

            {/* Season */}
            {product.season && (
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-base-200 p-2">
                  <Thermometer className="h-4 w-4 text-base-content/60" />
                </div>
                <div>
                  <p className="text-xs text-base-content/60">Mavsum</p>
                  <p className="font-semibold">{getSeasonLabel(product.season)}</p>
                </div>
              </div>
            )}

            {/* Load Index */}
            {product.loadIndex && (
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-base-200 p-2">
                  <Gauge className="h-4 w-4 text-base-content/60" />
                </div>
                <div>
                  <p className="text-xs text-base-content/60">Yuklanish indeksi</p>
                  <p className="font-semibold">{product.loadIndex}</p>
                </div>
              </div>
            )}

            {/* Speed Rating */}
            {product.speedRating && (
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-base-200 p-2">
                  <Zap className="h-4 w-4 text-base-content/60" />
                </div>
                <div>
                  <p className="text-xs text-base-content/60">Tezlik reytingi</p>
                  <p className="font-semibold">{product.speedRating}</p>
                </div>
              </div>
            )}

            {/* Show placeholder if no specs */}
            {!product.sizeString && !product.season && !product.loadIndex && !product.speedRating && (
              <p className="text-base-content/50 text-center py-4">
                Texnik xususiyatlar mavjud emas
              </p>
            )}
          </div>
        </div>

        {/* Price & Stock Info */}
        <div className="surface-card p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4">
            Narx va ombor
          </h3>
          <div className="space-y-4">
            {/* Purchase Price */}
            {product.purchasePrice !== undefined && (
              <div className="flex items-center justify-between py-2 border-b border-base-200">
                <span className="text-base-content/70">Xarid narxi</span>
                <span className="font-semibold">{formatCurrency(product.purchasePrice)}</span>
              </div>
            )}

            {/* Selling Price */}
            <div className="flex items-center justify-between py-2 border-b border-base-200">
              <span className="text-base-content/70">Sotish narxi</span>
              <span className="font-semibold text-success">{formatCurrency(product.sellingPrice)}</span>
            </div>

            {/* Profit Margin */}
            {product.purchasePrice !== undefined && product.purchasePrice > 0 && (
              <div className="flex items-center justify-between py-2 border-b border-base-200">
                <span className="text-base-content/70">Foyda</span>
                <span className="font-semibold text-primary">
                  {formatCurrency(product.sellingPrice - product.purchasePrice)}
                  <span className="text-xs text-base-content/50 ml-1">
                    ({Math.round(((product.sellingPrice - product.purchasePrice) / product.purchasePrice) * 100)}%)
                  </span>
                </span>
              </div>
            )}

            {/* Current Stock */}
            <div className="flex items-center justify-between py-2 border-b border-base-200">
              <span className="text-base-content/70">Joriy zaxira</span>
              <span className={clsx(
                'font-semibold',
                product.lowStock ? 'text-error' : ''
              )}>
                {product.quantity} dona
              </span>
            </div>

            {/* Min Stock Level */}
            <div className="flex items-center justify-between py-2">
              <span className="text-base-content/70">Minimal daraja</span>
              <span className="font-semibold">{product.minStockLevel} dona</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <div className="surface-card p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Tavsif
          </h3>
          <p className="text-base-content/80 whitespace-pre-wrap">{product.description}</p>
        </div>
      )}

      {/* Back Button */}
      <div className="flex justify-start">
        <button className="btn btn-ghost" onClick={() => navigate('/products')}>
          <ArrowLeft className="h-4 w-4" />
          Mahsulotlar ro'yxatiga qaytish
        </button>
      </div>
    </div>
  );
}

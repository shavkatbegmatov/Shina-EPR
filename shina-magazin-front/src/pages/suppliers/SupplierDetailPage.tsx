import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Truck,
  Phone,
  Mail,
  MapPin,
  User,
  Wallet,
  Building2,
  FileText,
  AlertCircle,
  CreditCard,
} from 'lucide-react';
import clsx from 'clsx';
import { suppliersApi } from '../../api/suppliers.api';
import { formatCurrency, formatDate } from '../../config/constants';
import type { Supplier } from '../../types';

export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSupplier = useCallback(async () => {
    if (!id) return;
    try {
      const data = await suppliersApi.getById(Number(id));
      setSupplier(data);
    } catch (error) {
      console.error('Failed to load supplier:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadSupplier();
  }, [loadSupplier]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-32 w-full" />
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-error mb-4" />
        <h2 className="text-xl font-semibold">Ta'minotchi topilmadi</h2>
        <button className="btn btn-primary mt-4" onClick={() => navigate('/suppliers')}>
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
            onClick={() => navigate('/suppliers')}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="section-title flex items-center gap-2">
              <Truck className="h-6 w-6" />
              {supplier.name}
            </h1>
            {supplier.contactPerson && (
              <p className="section-subtitle">{supplier.contactPerson}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={clsx('badge', supplier.active ? 'badge-success' : 'badge-error')}>
            {supplier.active ? 'Faol' : 'Nofaol'}
          </span>
          {supplier.hasDebt && (
            <span className="badge badge-warning">Qarzdor</span>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {supplier.phone && (
          <div className="surface-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-base-content/60">Telefon</p>
                <p className="font-semibold">{supplier.phone}</p>
              </div>
            </div>
          </div>
        )}

        {supplier.email && (
          <div className="surface-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-info/10 p-2.5">
                <Mail className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-xs text-base-content/60">Email</p>
                <p className="font-semibold truncate">{supplier.email}</p>
              </div>
            </div>
          </div>
        )}

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className={clsx(
              'rounded-lg p-2.5',
              supplier.hasDebt ? 'bg-error/10' : 'bg-success/10'
            )}>
              <Wallet className={clsx(
                'h-5 w-5',
                supplier.hasDebt ? 'text-error' : 'text-success'
              )} />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Balans</p>
              <p className={clsx(
                'font-semibold',
                supplier.balance < 0 ? 'text-error' : 'text-success'
              )}>
                {formatCurrency(Math.abs(supplier.balance))}
                {supplier.balance < 0 && ' (qarz)'}
              </p>
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-warning/10 p-2.5">
              <Building2 className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Ro'yxatdan o'tgan</p>
              <p className="font-semibold">{formatDate(supplier.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Contact Information */}
        <div className="surface-card p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4">
            Aloqa ma'lumotlari
          </h3>
          <div className="space-y-4">
            {/* Contact Person */}
            {supplier.contactPerson && (
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-base-200 p-2">
                  <User className="h-4 w-4 text-base-content/60" />
                </div>
                <div>
                  <p className="text-xs text-base-content/60">Mas'ul shaxs</p>
                  <p className="font-semibold">{supplier.contactPerson}</p>
                </div>
              </div>
            )}

            {/* Phone */}
            {supplier.phone && (
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-base-200 p-2">
                  <Phone className="h-4 w-4 text-base-content/60" />
                </div>
                <div>
                  <p className="text-xs text-base-content/60">Telefon</p>
                  <p className="font-semibold">{supplier.phone}</p>
                </div>
              </div>
            )}

            {/* Email */}
            {supplier.email && (
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-base-200 p-2">
                  <Mail className="h-4 w-4 text-base-content/60" />
                </div>
                <div>
                  <p className="text-xs text-base-content/60">Email</p>
                  <p className="font-semibold">{supplier.email}</p>
                </div>
              </div>
            )}

            {/* Address */}
            {supplier.address && (
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-base-200 p-2">
                  <MapPin className="h-4 w-4 text-base-content/60" />
                </div>
                <div>
                  <p className="text-xs text-base-content/60">Manzil</p>
                  <p className="font-semibold">{supplier.address}</p>
                </div>
              </div>
            )}

            {/* Show placeholder if minimal info */}
            {!supplier.contactPerson && !supplier.phone && !supplier.email && !supplier.address && (
              <p className="text-base-content/50 text-center py-4">
                Aloqa ma'lumotlari mavjud emas
              </p>
            )}
          </div>
        </div>

        {/* Financial Info */}
        <div className="surface-card p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-4">
            Moliyaviy ma'lumotlar
          </h3>
          <div className="space-y-4">
            {/* Balance */}
            <div className="flex items-center justify-between py-2 border-b border-base-200">
              <span className="text-base-content/70">Balans</span>
              <span className={clsx(
                'font-semibold',
                supplier.balance < 0 ? 'text-error' : 'text-success'
              )}>
                {supplier.balance < 0 ? '-' : ''}{formatCurrency(Math.abs(supplier.balance))}
              </span>
            </div>

            {/* Debt Status */}
            <div className="flex items-center justify-between py-2 border-b border-base-200">
              <span className="text-base-content/70">Qarz holati</span>
              <span className={clsx(
                'badge',
                supplier.hasDebt ? 'badge-warning' : 'badge-success'
              )}>
                {supplier.hasDebt ? 'Qarzdor' : 'Qarzsiz'}
              </span>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between py-2 border-b border-base-200">
              <span className="text-base-content/70">Holat</span>
              <span className={clsx(
                'badge',
                supplier.active ? 'badge-success' : 'badge-error'
              )}>
                {supplier.active ? 'Faol' : 'Nofaol'}
              </span>
            </div>

            {/* Bank Details */}
            {supplier.bankDetails && (
              <div className="flex items-start gap-3 pt-2">
                <div className="rounded-lg bg-base-200 p-2">
                  <CreditCard className="h-4 w-4 text-base-content/60" />
                </div>
                <div>
                  <p className="text-xs text-base-content/60">Bank rekvizitlari</p>
                  <p className="font-medium text-sm whitespace-pre-wrap">{supplier.bankDetails}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      {supplier.notes && (
        <div className="surface-card p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-base-content/60 mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Izoh
          </h3>
          <p className="text-base-content/80 whitespace-pre-wrap">{supplier.notes}</p>
        </div>
      )}

      {/* Back Button */}
      <div className="flex justify-start">
        <button className="btn btn-ghost" onClick={() => navigate('/suppliers')}>
          <ArrowLeft className="h-4 w-4" />
          Ta'minotchilar ro'yxatiga qaytish
        </button>
      </div>
    </div>
  );
}

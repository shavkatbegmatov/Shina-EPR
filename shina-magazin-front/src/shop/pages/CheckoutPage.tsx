import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, ChevronLeft, ChevronRight, Truck, Store, Banknote, CreditCard, Wallet, ShoppingBag, UserCheck } from 'lucide-react';
import { Card, Button, EmptyState, buttonVariants, cn } from '@/ui';
import { formatCurrency } from '../../config/constants';
import { useCartStore, selectCartSubtotal } from '../store/cartStore';
import { useOrderStore, generateOrderNo, calcDeliveryFee, type PaymentMethod, type DeliveryMethod } from '../store/orderStore';
import { ProductImage } from '../components/ProductImage';
import { usePortalAuthStore } from '../../portal/store/portalAuthStore';

const STEPS = ['contact', 'delivery', 'payment', 'review'] as const;

interface CheckoutForm {
  name: string;
  phone: string;
  email: string;
  deliveryMethod: DeliveryMethod;
  address: string;
  note: string;
  payment: PaymentMethod;
}

const PAYMENTS: PaymentMethod[] = ['cash', 'card', 'payme', 'click'];
const PAYMENT_ICON: Record<PaymentMethod, typeof Banknote> = {
  cash: Banknote, card: CreditCard, payme: Wallet, click: Wallet,
};

export function CheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore(selectCartSubtotal);
  const clear = useCartStore((s) => s.clear);
  const addOrder = useOrderStore((s) => s.addOrder);
  const portalCustomer = usePortalAuthStore((s) => s.customer);
  const isPortalAuth = usePortalAuthStore((s) => s.isAuthenticated);

  const [stepIdx, setStepIdx] = useState(0);
  const [form, setForm] = useState<CheckoutForm>({
    name: isPortalAuth && portalCustomer ? portalCustomer.fullName : '',
    phone: isPortalAuth && portalCustomer ? portalCustomer.phone : '',
    email: '', deliveryMethod: 'delivery', address: '', note: '', payment: 'cash',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof CheckoutForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const deliveryFee = calcDeliveryFee(form.deliveryMethod, subtotal);
  const total = subtotal + deliveryFee;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={ShoppingBag}
          title={t('shop.checkout.emptyTitle')}
          description={t('shop.checkout.emptyHint')}
          action={<Link to="/magazin/katalog" className={buttonVariants({ variant: 'primary' })}>{t('shop.nav.catalog')}</Link>}
        />
      </div>
    );
  }

  function validateStep(idx: number): boolean {
    const e: Record<string, string> = {};
    if (idx === 0) {
      if (!form.name.trim()) e.name = t('shop.checkout.required');
      if (form.phone.replace(/\D/g, '').length < 9) e.phone = t('shop.checkout.invalidPhone');
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = t('shop.checkout.invalidEmail');
    }
    if (idx === 1 && form.deliveryMethod === 'delivery' && !form.address.trim()) {
      e.address = t('shop.checkout.required');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const next = () => { if (validateStep(stepIdx)) setStepIdx((i) => Math.min(i + 1, STEPS.length - 1)); };
  const back = () => setStepIdx((i) => Math.max(i - 1, 0));

  const submit = () => {
    if (!validateStep(stepIdx)) return;
    const order = {
      orderNo: generateOrderNo(),
      createdAt: Date.now(),
      items,
      contact: { name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() || undefined },
      delivery: { method: form.deliveryMethod, address: form.address.trim() || undefined, note: form.note.trim() || undefined },
      payment: form.payment,
      subtotal, deliveryFee, total,
    };
    addOrder(order);
    clear();
    navigate(`/magazin/buyurtma/${order.orderNo}`);
  };

  const inputClass = (field: string) =>
    cn('h-12 w-full rounded-xl border bg-base-100 px-3 text-sm outline-none transition focus:border-primary',
      errors[field] ? 'border-error' : 'border-base-300');

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="section-title mb-6">{t('shop.checkout.title')}</h1>

      {/* Stepper */}
      <ol className="mb-8 flex items-center gap-2 overflow-x-auto">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold',
              i < stepIdx ? 'bg-primary text-primary-content' : i === stepIdx ? 'bg-primary text-primary-content ring-4 ring-primary/20' : 'bg-base-200 text-base-content/50')}>
              {i < stepIdx ? <Check size={16} /> : i + 1}
            </span>
            <span className={cn('whitespace-nowrap text-sm font-medium', i === stepIdx ? 'text-base-content' : 'text-base-content/50')}>
              {t(`shop.checkout.steps.${s}`)}
            </span>
            {i < STEPS.length - 1 && <ChevronRight size={16} className="mx-1 text-base-content/30" />}
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        {/* Step content */}
        <Card className="p-6">
          {stepIdx === 0 && (
            <div className="space-y-4">
              {isPortalAuth && portalCustomer ? (
                <div className="surface-soft flex items-center gap-2 rounded-xl p-3 text-sm">
                  <UserCheck size={16} className="shrink-0 text-primary" />
                  <span>{t('shop.checkout.loggedInAs', { name: portalCustomer.fullName })}</span>
                </div>
              ) : (
                <Link to="/kabinet/kirish" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                  {t('shop.checkout.haveAccount')} <ChevronRight size={14} />
                </Link>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium">{t('shop.checkout.name')} *</label>
                <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputClass('name')} placeholder={t('shop.checkout.namePlaceholder')} />
                {errors.name && <p className="mt-1 text-xs text-error">{errors.name}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t('shop.checkout.phone')} *</label>
                <input value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputClass('phone')} placeholder="+998 90 123 45 67" inputMode="tel" />
                {errors.phone && <p className="mt-1 text-xs text-error">{errors.phone}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t('shop.checkout.email')} <span className="text-base-content/40">({t('shop.checkout.optional')})</span></label>
                <input value={form.email} onChange={(e) => set('email', e.target.value)} className={inputClass('email')} placeholder="email@example.com" inputMode="email" />
                {errors.email && <p className="mt-1 text-xs text-error">{errors.email}</p>}
              </div>
            </div>
          )}

          {stepIdx === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {(['delivery', 'pickup'] as DeliveryMethod[]).map((m) => {
                  const Icon = m === 'delivery' ? Truck : Store;
                  return (
                    <button key={m} type="button" onClick={() => set('deliveryMethod', m)}
                      className={cn('flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition',
                        form.deliveryMethod === m ? 'border-primary bg-primary/5' : 'border-base-200 hover:border-base-300')}>
                      <Icon size={24} className={form.deliveryMethod === m ? 'text-primary' : 'text-base-content/50'} />
                      <span className="text-sm font-semibold">{t(`shop.checkout.${m}`)}</span>
                    </button>
                  );
                })}
              </div>
              {form.deliveryMethod === 'delivery' ? (
                <div>
                  <label className="mb-1 block text-sm font-medium">{t('shop.checkout.address')} *</label>
                  <input value={form.address} onChange={(e) => set('address', e.target.value)} className={inputClass('address')} placeholder={t('shop.checkout.addressPlaceholder')} />
                  {errors.address && <p className="mt-1 text-xs text-error">{errors.address}</p>}
                </div>
              ) : (
                <div className="surface-soft rounded-xl p-4 text-sm text-base-content/70">{t('shop.checkout.pickupNote')}</div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium">{t('shop.checkout.note')}</label>
                <textarea value={form.note} onChange={(e) => set('note', e.target.value)} rows={3} className="w-full rounded-xl border border-base-300 bg-base-100 p-3 text-sm outline-none transition focus:border-primary" placeholder={t('shop.checkout.notePlaceholder')} />
              </div>
            </div>
          )}

          {stepIdx === 2 && (
            <div className="space-y-3">
              {PAYMENTS.map((p) => {
                const Icon = PAYMENT_ICON[p];
                return (
                  <button key={p} type="button" onClick={() => set('payment', p)}
                    className={cn('flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition',
                      form.payment === p ? 'border-primary bg-primary/5' : 'border-base-200 hover:border-base-300')}>
                    <Icon size={22} className={form.payment === p ? 'text-primary' : 'text-base-content/50'} />
                    <div>
                      <p className="text-sm font-semibold">{t(`shop.checkout.pay.${p}`)}</p>
                      <p className="text-xs text-base-content/60">{t(`shop.checkout.payDesc.${p}`)}</p>
                    </div>
                    <span className={cn('ml-auto grid h-5 w-5 place-items-center rounded-full border-2', form.payment === p ? 'border-primary' : 'border-base-300')}>
                      {form.payment === p && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {stepIdx === 3 && (
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="mb-2 font-semibold">{t('shop.checkout.steps.contact')}</h3>
                <p className="text-base-content/70">{form.name} · {form.phone}{form.email ? ` · ${form.email}` : ''}</p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold">{t('shop.checkout.steps.delivery')}</h3>
                <p className="text-base-content/70">
                  {t(`shop.checkout.${form.deliveryMethod}`)}{form.deliveryMethod === 'delivery' && form.address ? ` — ${form.address}` : ''}
                </p>
                {form.note && <p className="mt-1 text-base-content/50">{form.note}</p>}
              </div>
              <div>
                <h3 className="mb-2 font-semibold">{t('shop.checkout.steps.payment')}</h3>
                <p className="text-base-content/70">{t(`shop.checkout.pay.${form.payment}`)}</p>
              </div>
              <div className="surface-soft rounded-xl p-3 text-xs text-base-content/60">{t('shop.checkout.demoNote')}</div>
            </div>
          )}

          {/* Nav buttons */}
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-base-200 pt-5">
            {stepIdx > 0 ? (
              <Button variant="ghost" onClick={back} className="gap-1"><ChevronLeft size={16} /> {t('shop.checkout.back')}</Button>
            ) : (
              <Link to="/magazin/katalog" className={cn(buttonVariants({ variant: 'ghost' }), 'gap-1')}><ChevronLeft size={16} /> {t('shop.nav.catalog')}</Link>
            )}
            {stepIdx < STEPS.length - 1 ? (
              <Button onClick={next} className="gap-1">{t('shop.checkout.next')} <ChevronRight size={16} /></Button>
            ) : (
              <Button variant="success" onClick={submit} className="gap-2"><Check size={18} /> {t('shop.checkout.placeOrder')}</Button>
            )}
          </div>
        </Card>

        {/* Summary */}
        <div>
          <Card className="lg:sticky lg:top-20 p-5">
            <h2 className="mb-4 font-semibold">{t('shop.checkout.summary')}</h2>
            <ul className="mb-4 space-y-3">
              {items.map(({ product, qty }) => (
                <li key={product.id} className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-base-200">
                    <ProductImage src={product.imageUrl} alt={product.name} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-base-content/50">{qty} × {formatCurrency(product.sellingPrice)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="space-y-2 border-t border-base-200 pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-base-content/60">{t('shop.checkout.subtotal')}</dt><dd>{formatCurrency(subtotal)}</dd></div>
              <div className="flex justify-between">
                <dt className="text-base-content/60">{t('shop.checkout.deliveryFee')}</dt>
                <dd>{deliveryFee === 0 ? <span className="text-success">{t('shop.checkout.free')}</span> : formatCurrency(deliveryFee)}</dd>
              </div>
              <div className="flex justify-between border-t border-base-200 pt-2 text-base font-bold">
                <dt>{t('shop.checkout.total')}</dt><dd className="text-primary">{formatCurrency(total)}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}

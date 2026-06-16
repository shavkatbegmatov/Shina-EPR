import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Car, Mountain, Gauge, Snowflake, ShieldCheck, Truck, BadgeCheck } from 'lucide-react';
import { Card, buttonVariants, cn } from '@/ui';
import { ProductCard } from '../components/ProductCard';
import { ShopLogo } from '../components/layout/ShopLogo';
import { DEMO_PRODUCTS } from '../data/demoProducts';

const CATEGORIES = [
  { key: 'passenger', icon: Car, to: '/magazin/katalog' },
  { key: 'suv', icon: Mountain, to: '/magazin/katalog' },
  { key: 'sport', icon: Gauge, to: '/magazin/katalog' },
  { key: 'winter', icon: Snowflake, to: '/magazin/katalog?season=WINTER' },
] as const;

const WHY = [
  { key: 'original', icon: BadgeCheck },
  { key: 'warranty', icon: ShieldCheck },
  { key: 'delivery', icon: Truck },
] as const;

export function ShopHomePage() {
  const { t } = useTranslation();
  const featured = DEMO_PRODUCTS.slice(0, 8);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary text-primary-content">
        <div className="absolute -right-16 -top-16 opacity-10">
          <ShopLogo className="h-96 w-96" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-content/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            {t('shop.hero.badge')}
          </span>
          <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            {t('shop.hero.title')}
          </h1>
          <p className="mt-4 max-w-xl text-base text-primary-content/80 md:text-lg">
            {t('shop.hero.subtitle')}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/magazin/katalog" className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'gap-2')}>
              {t('shop.hero.ctaPrimary')} <ArrowRight size={18} />
            </Link>
            <Link to="/magazin/katalog?season=WINTER" className={buttonVariants({ variant: 'outline', size: 'lg' }) + ' border-primary-content/40 text-primary-content hover:bg-primary-content/10'}>
              {t('shop.hero.ctaSecondary')}
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="section-title mb-6">{t('shop.home.categories')}</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {CATEGORIES.map(({ key, icon: Icon, to }) => (
            <Link key={key} to={to}>
              <Card className="group flex h-full flex-col items-center gap-3 p-6 text-center transition-shadow hover:shadow-strong">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-content">
                  <Icon size={26} />
                </span>
                <span className="font-semibold">{t(`shop.home.cat.${key}`)}</span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="section-title">{t('shop.home.featured')}</h2>
          <Link to="/magazin/katalog" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            {t('shop.home.viewAll')} <ArrowRight size={15} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* Why us */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {WHY.map(({ key, icon: Icon }) => (
            <Card key={key} className="flex items-start gap-4 p-6">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-secondary/10 text-secondary">
                <Icon size={24} />
              </span>
              <div>
                <h3 className="font-semibold">{t(`shop.home.why.${key}.title`)}</h3>
                <p className="mt-1 text-sm text-base-content/60">{t(`shop.home.why.${key}.desc`)}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
        <Card className="flex flex-col items-center justify-between gap-4 bg-gradient-to-r from-primary/10 to-secondary/10 p-8 text-center sm:flex-row sm:text-left">
          <div>
            <h3 className="text-xl font-bold">{t('shop.home.ctaTitle')}</h3>
            <p className="mt-1 text-sm text-base-content/70">{t('shop.home.ctaText')}</p>
          </div>
          <Link to="/magazin/katalog" className={cn(buttonVariants({ variant: 'primary', size: 'lg' }), 'gap-2 shrink-0')}>
            {t('shop.home.ctaButton')} <ArrowRight size={18} />
          </Link>
        </Card>
      </section>
    </div>
  );
}

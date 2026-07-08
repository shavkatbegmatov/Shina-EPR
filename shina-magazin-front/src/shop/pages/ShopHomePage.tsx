import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Car, Mountain, Gauge, Snowflake, ShieldCheck, Truck, BadgeCheck } from 'lucide-react';
import { Card, buttonVariants, cn } from '@/ui';
import { ProductCard } from '../components/ProductCard';
import { RecentlyViewed } from '../components/RecentlyViewed';
import { ShopLogo } from '../components/layout/ShopLogo';
import { TireSizeFinder } from '../components/TireSizeFinder';
import { useCatalogProducts } from '../data/useCatalog';

const CATEGORIES = [
  { key: 'passenger', icon: Car, to: '/katalog' },
  { key: 'suv', icon: Mountain, to: '/katalog' },
  { key: 'sport', icon: Gauge, to: '/katalog' },
  { key: 'winter', icon: Snowflake, to: '/katalog?season=WINTER' },
] as const;

const WHY = [
  { key: 'original', icon: BadgeCheck },
  { key: 'warranty', icon: ShieldCheck },
  { key: 'delivery', icon: Truck },
] as const;

export function ShopHomePage() {
  const { t } = useTranslation();
  const { products } = useCatalogProducts();
  const featured = products.slice(0, 8);

  const brandCounts = useMemo(() => {
    const m = new Map<string, number>();
    products.forEach((p) => {
      if (p.brandName) m.set(p.brandName, (m.get(p.brandName) ?? 0) + 1);
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [products]);

  return (
    <div>
      {/* Hero — "tungi trassa": ikkala temada ham qorong'i asfalt sahna.
          data-theme="shina-dark" scope tokenlarni dark variantga o'tkazadi. */}
      <section data-theme="shina-dark" className="relative overflow-hidden bg-base-100 text-base-content">
        {/* Fara glowlari: kobalt (chap-tepa) + amber signal (o'ng-past) */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,oklch(var(--p)/0.22),transparent_55%),radial-gradient(ellipse_at_bottom_right,oklch(var(--s)/0.16),transparent_55%)]" />
        {/* Yo'l qirrasi — pastki gradient chiziq */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="absolute -right-16 -top-16 opacity-[0.08]">
          <ShopLogo className="h-96 w-96" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            {t('shop.hero.badge')}
          </span>
          <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            {t('shop.hero.title')}
          </h1>
          <p className="mt-4 max-w-xl text-base text-base-content/70 md:text-lg">
            {t('shop.hero.subtitle')}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/katalog" className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'gap-2 shadow-[var(--glow-secondary)]')}>
              {t('shop.hero.ctaPrimary')} <ArrowRight size={18} />
            </Link>
            <Link to="/katalog?season=WINTER" className={buttonVariants({ variant: 'outline', size: 'lg' }) + ' border-base-content/30 text-base-content hover:bg-base-content/10'}>
              {t('shop.hero.ctaSecondary')}
            </Link>
          </div>
        </div>
      </section>

      {/* Tire size finder — heroni biroz qoplaydi */}
      <section className="relative z-10 mx-auto -mt-8 max-w-7xl px-4 sm:px-6">
        <TireSizeFinder className="shadow-strong" />
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

      {/* Brands */}
      <section className="mx-auto max-w-7xl px-4 pb-2 sm:px-6">
        <h2 className="section-title mb-6">{t('shop.home.brands')}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {brandCounts.map(([brand, count]) => (
            <Link key={brand} to={`/katalog?brand=${encodeURIComponent(brand)}`}>
              <Card className="flex h-full flex-col items-center justify-center gap-1 p-4 text-center transition-shadow hover:border-primary/40 hover:shadow-strong">
                <span className="font-bold">{brand}</span>
                <span className="text-xs text-base-content/50">{t('shop.home.brandCount', { count })}</span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="section-title">{t('shop.home.featured')}</h2>
          <Link to="/katalog" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            {t('shop.home.viewAll')} <ArrowRight size={15} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* Recently viewed */}
      <RecentlyViewed className="mx-auto max-w-7xl px-4 pt-12 sm:px-6" />

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

      {/* CTA band — hero bilan hamohang "tungi" karta */}
      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
        <Card
          data-theme="shina-dark"
          className="relative flex flex-col items-center justify-between gap-4 overflow-hidden border-primary/20 bg-base-100 p-8 text-center text-base-content sm:flex-row sm:text-left"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,oklch(var(--p)/0.2),transparent_60%),radial-gradient(ellipse_at_bottom_right,oklch(var(--s)/0.16),transparent_55%)]" />
          <div className="relative">
            <h3 className="text-xl font-bold">{t('shop.home.ctaTitle')}</h3>
            <p className="mt-1 text-sm text-base-content/70">{t('shop.home.ctaText')}</p>
          </div>
          <Link to="/katalog" className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'relative gap-2 shrink-0 shadow-[var(--glow-secondary)]')}>
            {t('shop.home.ctaButton')} <ArrowRight size={18} />
          </Link>
        </Card>
      </section>
    </div>
  );
}

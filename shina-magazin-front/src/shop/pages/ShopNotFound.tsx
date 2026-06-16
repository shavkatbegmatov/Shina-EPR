import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { buttonVariants } from '@/ui';
import { ShopLogo } from '../components/layout/ShopLogo';

export function ShopNotFound() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center sm:px-6">
      <ShopLogo className="h-20 w-20 opacity-40" />
      <p className="mt-6 text-6xl font-extrabold tracking-tight text-base-content/20">404</p>
      <h1 className="mt-2 text-2xl font-bold">{t('shop.notFound.title')}</h1>
      <p className="mt-2 text-base-content/60">{t('shop.notFound.hint')}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/magazin" className={buttonVariants({ variant: 'primary' })}>{t('shop.nav.home')}</Link>
        <Link to="/magazin/katalog" className={buttonVariants({ variant: 'outline' })}>{t('shop.nav.catalog')}</Link>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Phone, MapPin, Mail } from 'lucide-react';
import { ShopLogo } from './ShopLogo';

export function ShopFooter() {
  const { t } = useTranslation();

  return (
    <footer className="mt-16 border-t border-base-200 bg-base-100">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <ShopLogo className="h-9 w-9" />
            <span className="text-lg font-extrabold tracking-tight">Protektor</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-base-content/60">{t('shop.footer.aboutText')}</p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">{t('shop.footer.links')}</h3>
          <ul className="space-y-2 text-sm text-base-content/70">
            <li><Link to="/" className="hover:text-primary">{t('shop.nav.home')}</Link></li>
            <li><Link to="/katalog" className="hover:text-primary">{t('shop.nav.catalog')}</Link></li>
            <li><Link to="/hisob" className="hover:text-primary">{t('shop.footer.account')}</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">{t('shop.footer.contact')}</h3>
          <ul className="space-y-2 text-sm text-base-content/70">
            <li className="flex items-center gap-2"><Phone size={15} className="text-primary" /> +998 71 200 00 00</li>
            <li className="flex items-center gap-2"><Mail size={15} className="text-primary" /> info@protektor.uz</li>
            <li className="flex items-center gap-2"><MapPin size={15} className="text-primary" /> {t('shop.footer.address')}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-base-200">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-base-content/50 sm:flex-row sm:px-6">
          <span>© 2026 Protektor. {t('shop.footer.rights')}</span>
          <span>{t('shop.footer.madeIn')}</span>
        </div>
      </div>
    </footer>
  );
}

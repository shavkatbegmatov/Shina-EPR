import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, Menu, X, Sun, Moon, Globe, Heart, Scale, User } from 'lucide-react';
import { Button, Badge, buttonVariants, cn } from '@/ui';
import { useThemeStore } from '../../../shared/theme/themeStore';
import { useCartStore, selectCartCount } from '../../store/cartStore';
import { useWishlistStore, selectWishlistCount } from '../../store/wishlistStore';
import { useCompareStore, selectCompareCount } from '../../store/compareStore';
import { ShopSearchBox } from '../ShopSearchBox';
import { ShopLogo } from './ShopLogo';

interface ShopHeaderProps {
  onOpenCart: () => void;
}

export function ShopHeader({ onOpenCart }: ShopHeaderProps) {
  const { t, i18n } = useTranslation();
  const { mode, setMode } = useThemeStore();
  const cartCount = useCartStore(selectCartCount);
  const wishlistCount = useWishlistStore(selectWishlistCount);
  const compareCount = useCompareStore(selectCompareCount);
  const [menuOpen, setMenuOpen] = useState(false);

  const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const toggleTheme = () => setMode(isDark ? 'light' : 'dark');
  const toggleLang = () => i18n.changeLanguage(i18n.language === 'uz' ? 'ru' : 'uz');

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn('text-sm font-medium transition-colors hover:text-primary', isActive ? 'text-primary' : 'text-base-content/70');

  return (
    <header className="sticky top-0 z-40 border-b border-base-200 bg-base-100/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Protektor">
          <ShopLogo className="h-9 w-9" />
          <span className="text-lg font-extrabold tracking-tight">
            Protektor
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="ml-4 hidden items-center gap-6 md:flex">
          <NavLink to="/" end className={navLinkClass}>{t('shop.nav.home')}</NavLink>
          <NavLink to="/katalog" className={navLinkClass}>{t('shop.nav.catalog')}</NavLink>
          <NavLink to="/buyurtmalarim" className={navLinkClass}>{t('shop.nav.orders')}</NavLink>
        </nav>

        {/* Desktop search (jonli takliflar) */}
        <ShopSearchBox className="ml-auto hidden max-w-xs flex-1 lg:block" />

        {/* Actions */}
        <div className="ml-auto flex items-center gap-1 lg:ml-2">
          <Button variant="ghost" size="sm" iconOnly onClick={toggleLang} title={t('shop.language.toggle')} aria-label={t('shop.language.toggle')}>
            <span className="flex items-center gap-1"><Globe size={16} /><span className="text-xs font-semibold uppercase">{i18n.language}</span></span>
          </Button>
          <Button variant="ghost" size="sm" iconOnly onClick={toggleTheme} title={t('shop.theme.toggle')} aria-label={t('shop.theme.toggle')}>
            {isDark ? <Moon size={18} /> : <Sun size={18} />}
          </Button>
          <Link to="/kabinet" className={cn(buttonVariants({ variant: 'ghost', size: 'sm', iconOnly: true }), 'hidden sm:inline-flex')} title={t('shop.nav.account')} aria-label={t('shop.nav.account')}>
            <User size={18} />
          </Link>
          <Link to="/solishtirish" className={cn(buttonVariants({ variant: 'ghost', size: 'sm', iconOnly: true }), 'relative hidden sm:inline-flex')} title={t('shop.compare.title')} aria-label={t('shop.compare.title')}>
            <Scale size={18} />
            {compareCount > 0 && (
              <Badge tone="primary" className="absolute -right-1 -top-1 min-w-5 justify-center px-1 py-0 text-[10px] font-bold">
                {compareCount}
              </Badge>
            )}
          </Link>
          <Link to="/saqlanganlar" className={cn(buttonVariants({ variant: 'ghost', size: 'sm', iconOnly: true }), 'relative')} title={t('shop.nav.wishlist')} aria-label={t('shop.nav.wishlist')}>
            <Heart size={18} />
            {wishlistCount > 0 && (
              <Badge tone="error" className="absolute -right-1 -top-1 min-w-5 justify-center px-1 py-0 text-[10px] font-bold">
                {wishlistCount}
              </Badge>
            )}
          </Link>
          <Button variant="ghost" size="sm" iconOnly onClick={onOpenCart} title={t('shop.cart.title')} aria-label={t('shop.cart.title')} className="relative">
            <ShoppingCart size={18} />
            {cartCount > 0 && (
              <Badge tone="primary" className="absolute -right-1 -top-1 min-w-5 justify-center px-1 py-0 text-[10px] font-bold">
                {cartCount}
              </Badge>
            )}
          </Button>
          <Button variant="ghost" size="sm" iconOnly onClick={() => setMenuOpen((o) => !o)} className="md:hidden" aria-label={t('shop.nav.menu')}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-base-200 bg-base-100 px-4 py-4 md:hidden">
          <ShopSearchBox className="mb-3" onNavigate={() => setMenuOpen(false)} />
          <nav className="flex flex-col">
            <NavLink to="/" end onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2.5 text-sm font-medium hover:bg-base-200">{t('shop.nav.home')}</NavLink>
            <NavLink to="/katalog" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2.5 text-sm font-medium hover:bg-base-200">{t('shop.nav.catalog')}</NavLink>
            <NavLink to="/saqlanganlar" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2.5 text-sm font-medium hover:bg-base-200">{t('shop.nav.wishlist')}</NavLink>
            <NavLink to="/solishtirish" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2.5 text-sm font-medium hover:bg-base-200">{t('shop.compare.title')}</NavLink>
            <NavLink to="/buyurtmalarim" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2.5 text-sm font-medium hover:bg-base-200">{t('shop.nav.orders')}</NavLink>
            <Link to="/kabinet" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2.5 text-sm font-medium hover:bg-base-200">{t('shop.nav.account')}</Link>
          </nav>
        </div>
      )}
    </header>
  );
}

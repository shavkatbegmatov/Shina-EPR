import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '../../../components/common/ErrorBoundary';
import { ShopHeader } from './ShopHeader';
import { ShopFooter } from './ShopFooter';
import { CartDrawer } from '../CartDrawer';
import { QuickViewModal } from '../QuickViewModal';
import { ShopRouteEffects } from '../ShopRouteEffects';

/**
 * Protektor storefront layout — ommaviy (auth talab qilmaydi).
 * `data-app="shop"` brend intensivligini ERP'dan ajratish uchun (kelajakda CSS hook).
 * Savat drawer holati shu yerda boshqariladi.
 */
export default function ShopLayout() {
  const [cartOpen, setCartOpen] = useState(false);
  const location = useLocation();

  return (
    <div data-app="shop" className="flex min-h-screen flex-col bg-base-200/40">
      <ShopRouteEffects />
      <ShopHeader onOpenCart={() => setCartOpen(true)} />
      <main className="flex-1">
        {/* Vitrina ommaviy — bitta render xatosi butun do'konni oq ekranga
            aylantirmasligi kerak. Header/footer va savat ishlab turadi. */}
        <ErrorBoundary resetKeys={[location.pathname]}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <ShopFooter />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <QuickViewModal />
    </div>
  );
}

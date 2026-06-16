import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ShopHeader } from './ShopHeader';
import { ShopFooter } from './ShopFooter';
import { CartDrawer } from '../CartDrawer';
import { ShopRouteEffects } from '../ShopRouteEffects';

/**
 * Protektor storefront layout — ommaviy (auth talab qilmaydi).
 * `data-app="shop"` brend intensivligini ERP'dan ajratish uchun (kelajakda CSS hook).
 * Savat drawer holati shu yerda boshqariladi.
 */
export default function ShopLayout() {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <div data-app="shop" className="flex min-h-screen flex-col bg-base-200/40">
      <ShopRouteEffects />
      <ShopHeader onOpenCart={() => setCartOpen(true)} />
      <main className="flex-1">
        <Outlet />
      </main>
      <ShopFooter />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}

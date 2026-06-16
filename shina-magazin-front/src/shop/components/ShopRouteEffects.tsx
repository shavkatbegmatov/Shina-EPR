import { useEffect } from 'react';
import { useLocation, useMatches } from 'react-router-dom';

/**
 * Storefront marshrut effektlari:
 * - har sahifa almashganda yuqoriga skroll (SPA UX)
 * - hujjat sarlavhasini marshrut handle.title dan o'rnatadi (SEO/tab nomi)
 * Hech narsa render qilmaydi.
 */
export function ShopRouteEffects() {
  const { pathname } = useLocation();
  const matches = useMatches();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  useEffect(() => {
    const last = [...matches].reverse().find((m) => (m.handle as { title?: string } | undefined)?.title);
    const title = (last?.handle as { title?: string } | undefined)?.title;
    document.title = title ? `${title} · Protektor` : 'Protektor';
  }, [matches]);

  return null;
}

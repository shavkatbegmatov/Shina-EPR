import { useEffect } from 'react';
import { useLocation, useMatches } from 'react-router-dom';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

interface ShopRouteHandle {
  title?: string;
  description?: string;
}

/**
 * Storefront marshrut effektlari:
 * - har sahifa almashganda yuqoriga skroll (SPA UX)
 * - hujjat sarlavhasi + SEO/OpenGraph meta teglarini marshrut handle'dan o'rnatadi
 *   (dinamik sahifalar, masalan PDP, mahsulot yuklanganda uni override qiladi).
 * Hech narsa render qilmaydi.
 */
export function ShopRouteEffects() {
  const { pathname } = useLocation();
  const matches = useMatches();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  const handle = [...matches]
    .reverse()
    .find((m) => (m.handle as ShopRouteHandle | undefined)?.title)?.handle as ShopRouteHandle | undefined;

  useDocumentMeta({ title: handle?.title, description: handle?.description });

  return null;
}

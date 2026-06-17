import { useEffect } from 'react';

export interface DocumentMeta {
  /** Sahifa sarlavhasi (sayt nomi avtomatik qo'shiladi). undefined — o'zgartirilmaydi. */
  title?: string;
  /** Meta description + og:description. undefined/bo'sh — o'zgartirilmaydi. */
  description?: string;
  /** og:image (mahsulot rasmi). Nisbiy URL absolyutga aylantiriladi. */
  image?: string;
  /** og:type — default 'website' (PDP uchun 'product'). */
  type?: string;
}

const SITE = 'Protektor';

/** head'dagi <meta>ni topib yangilaydi, bo'lmasa yaratadi (upsert). */
function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Storefront sahifa sarlavhasi + SEO/OpenGraph meta teglarini o'rnatadi.
 *
 * react-helmet'siz: head teglarini to'g'ridan-to'g'ri upsert qiladi. SPA bo'lgani
 * uchun tozalanmaydi — keyingi sahifa o'z qiymatini yozadi. undefined maydon
 * o'zgartirilmaydi: shu sababli ShopRouteEffects (route default) va dinamik
 * sahifa (masalan PDP mahsulot) bir-birini to'g'ri to'ldiradi.
 */
export function useDocumentMeta({ title, description, image, type = 'website' }: DocumentMeta): void {
  useEffect(() => {
    if (title !== undefined) {
      const fullTitle = title ? `${title} · ${SITE}` : SITE;
      document.title = fullTitle;
      upsertMeta('property', 'og:title', fullTitle);
      upsertMeta('property', 'og:type', type);
      upsertMeta('property', 'og:site_name', SITE);
      upsertMeta('property', 'og:url', window.location.href);
    }
    if (description) {
      upsertMeta('name', 'description', description);
      upsertMeta('property', 'og:description', description);
    }
    if (image) {
      const absolute = /^https?:\/\//.test(image) ? image : `${window.location.origin}${image}`;
      upsertMeta('property', 'og:image', absolute);
    }
  }, [title, description, image, type]);
}

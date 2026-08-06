import { usePublicSettings } from './usePublicSettings';
import type { ImageFallbackMode } from '../components/ProductImage';

/**
 * Storefront rasmsiz mahsulot ko'rinishi (adminka sozlamasi).
 *
 * Ommaviy `GET /v1/settings/public` dan o'qiydi; backend yo'q/xato bo'lsa
 * 'svg' (default) — do'kon baribir to'g'ri ko'rinadi. react-query keshi
 * tufayli sahifadagi barcha ProductImage'lar uchun bitta so'rov yuboriladi.
 */
export function useStorefrontImageFallback(): ImageFallbackMode {
  const settings = usePublicSettings();
  return settings?.imageFallback === 'PHOTO' ? 'photo' : 'svg';
}

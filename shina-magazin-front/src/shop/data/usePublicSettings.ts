import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../../api/settings.api';
import type { PublicSettings } from '../../types';

/**
 * Storefront uchun ommaviy sozlamalar (`GET /v1/settings/public`).
 *
 * <p>Yagona `queryKey` — sahifada nechta iste'molchi bo'lsa ham react-query
 * bitta so'rov yuboradi (`ProductImage` ning fallback rejimi va login
 * sahifasidagi Telegram tugmasi shu bitta javobdan foydalanadi).
 *
 * <p>`retry: false` — bu sozlama YORDAMCHI. Backend yo'q bo'lsa do'kon
 * baribir ochilishi kerak, shunchaki default qiymatlar bilan.
 */
export function usePublicSettings(): PublicSettings | undefined {
  const { data } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => settingsApi.getPublic(),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
  return data;
}

/**
 * Telegram orqali ro'yxatdan o'tish havolasi.
 *
 * <p>Sozlama o'chiq yoki bot username kiritilmagan bo'lsa `null` — chaqiruvchi
 * tugmani umuman ko'rsatmasligi kerak. Backend ham shu ikkovini birga
 * tekshiradi, bu esa ikkinchi himoya.
 *
 * <p>`?start=` payload'i bot uchun majburiy emas, lekin havolani bosgan odam
 * uchun Telegram darhol "START" tugmasini ko'rsatadi — ya'ni bitta ortiqcha
 * qadam kamayadi.
 */
export function useTelegramRegisterUrl(): string | null {
  const settings = usePublicSettings();
  const username = settings?.telegramBotUsername?.trim();

  if (!settings?.telegramRegistrationEnabled || !username) {
    return null;
  }
  return `https://t.me/${username}?start=register`;
}

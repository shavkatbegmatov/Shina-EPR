import { useEffect, useRef } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useNotificationsStore } from '../store/notificationsStore';

/**
 * WebSocket bildirishnomasi kelganda so'rovlarni yangilaydi.
 *
 * <p>Ilgari har bir sahifada bir xil effekt takrorlanardi:
 * <pre>
 * useEffect(() => {
 *   if (notifications.length &gt; 0) { void loadX(); void loadY(); }
 * }, [notifications.length]);
 * </pre>
 * Har biri o'z yuklovchilarini qo'lda sanab chiqardi va yangi so'rov
 * qo'shilganda ro'yxatga qo'shishni unutish oson edi — ekran eski ma'lumot
 * bilan qolardi.
 *
 * <p>Kalitlar PREFIKS bo'yicha bekor qilinadi: `['suppliers']` bersangiz
 * uning ostidagi ro'yxat, statistika va tafsilotlar ham yangilanadi.
 */
export function useInvalidateOnNotification(keys: QueryKey[]) {
  const queryClient = useQueryClient();
  const { notifications } = useNotificationsStore();
  const count = notifications.length;

  // Kalitlar massivi har renderda yangi bo'ladi — uni effekt bog'liqligiga
  // qo'ysak cheksiz sikl chiqardi. Shuning uchun faqat SON kuzatiladi.
  const keysRef = useRef(keys);
  keysRef.current = keys;

  useEffect(() => {
    if (count === 0) return;
    for (const queryKey of keysRef.current) {
      void queryClient.invalidateQueries({ queryKey });
    }
  }, [count, queryClient]);
}

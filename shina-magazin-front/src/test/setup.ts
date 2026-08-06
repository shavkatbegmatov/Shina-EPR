import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup, configure } from '@testing-library/react';

/**
 * `waitFor` / `findBy*` byudjeti.
 *
 * <p>testing-library ning sukut qiymati — 1000 ms. U KICHIK komponentlar
 * uchun mo'ljallangan, bizdagi sahifalar esa katta: `DebtsPage` ning yuklash
 * xatosi holati bo'sh mashinada ham ~180 ms oladi (avval skelet render
 * bo'ladi, ikkala so'rov rad etilgach butun sahifa qayta render bo'ladi).
 * Ya'ni zaxira atigi ~5 barobar.
 *
 * <p>To'plam 60+ faylni parallel jsdom worker'larida ishlatadi. Vaqti-vaqti
 * bilan bitta worker CPU/GC uchun kurashda yuz millisekundlarga to'xtab
 * qoladi — va o'sha ~5 barobarlik zaxira yetmay qoladi. Natijada test
 * YAKKA holda doim o'tadi, to'liq to'plamda esa tasodifan yiqiladi.
 *
 * <p><b>Bu xatoni yashirish emas.</b> Tekshirildi va rad etildi: fayllar
 * orasida i18n/localStorage sizishi, takrorlangan element, React Query
 * qayta urinishi, "qotib qolgan" holat — hech biri yo'q. Kutilayotgan holat
 * HAR DOIM keladi, faqat sekin mashinada 1000 ms dan kechroq. Kattaroq
 * byudjet SOG'LOM testni sekinlashtirmaydi (kutish holat kelishi bilan
 * tugaydi), faqat haqiqiy yiqilish sekinroq xabar beradi.
 */
configure({ asyncUtilTimeout: 5000 });

/**
 * `ResizeObserver` — jsdom da yo'q.
 *
 * <p>Recharts'ning `ResponsiveContainer` i uni talab qiladi, ya'ni grafikli
 * sahifani render qilishga urinish `ReferenceError` bilan tugaydi. Bu
 * o'lchash uchun ishlatiladi, testda esa o'lcham baribir nol — shuning
 * uchun bo'sh amalga oshirish yetarli.
 */
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// Har testdan keyin DOM ni tozalaymiz
afterEach(() => {
  cleanup();
});

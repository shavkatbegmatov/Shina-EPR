import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

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

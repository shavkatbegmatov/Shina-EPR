import { useEffect, useState } from 'react';

/**
 * Qiymatning "tinchlangan" versiyasini qaytaradi.
 *
 * <p>Katalog qidiruvi server tomonga o'tgach kerak bo'ldi: `q` har bosilgan
 * harfda o'zgaradi va uni to'g'ridan-to'g'ri so'rov parametriga ulasak,
 * "michelin" yozish 8 ta HTTP so'rov qilardi.
 *
 * <p>Oxirgi o'zgarishdan keyin `delay` ms jim turilsa, yangi qiymat qaytariladi.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

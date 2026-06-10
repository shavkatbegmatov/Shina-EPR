import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * clsx + tailwind-merge: shartli klasslarni birlashtiradi va bir-biriga zid
 * Tailwind utilitalarini (mas. `px-2 px-4`) dedup qiladi. Primitivlar uchun standart.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

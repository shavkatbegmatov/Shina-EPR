/**
 * Barter yordamchilari — sof funksiyalar (komponentdan alohida, sinaladigan).
 */

/** Server bilan bir xil kalit: `BU-205-55-R16[-BREND]` — kassir SKU o'ylamaydi. */
export function usedTireSku(
  width: number,
  profile: number,
  diameter: number,
  brandName?: string
): string {
  const base = `BU-${width}-${profile}-R${diameter}`;
  const code = (brandName ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  return code ? `${base}-${code}` : base;
}

/**
 * Kredit asosida B/U sotish narxi taklifi: ×1,5, mingga yaxlitlangan.
 * Faqat taklif — kassir o'zgartirsa ergashmaydi (`TradeInModal`).
 */
export function suggestResalePrice(unitValue: number): number {
  if (unitValue <= 0) return 0;
  return Math.round((unitValue * 1.5) / 1000) * 1000;
}

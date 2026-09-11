import type { Product } from '../types';

/**
 * Xarid (kirim hujjati) savati — sof mantiq.
 *
 * <p>Ilgari bu hisoblar `SuppliersPage` ichidagi handler'lar orasiga tarqalgan
 * edi va ularni tekshirishning yagona yo'li butun sahifani render qilish
 * bo'lardi. Bu yerda pul arifmetikasi — xato bo'lsa ta'minotchiga noto'g'ri
 * summa yoziladi, shuning uchun u alohida va sinaladigan bo'lishi kerak.
 *
 * <p>Narx va bonus HUJJAT VALYUTASIDA saqlanadi (USD hujjatda dollarda);
 * so'mga aylantirish `purchasePricing` da.
 */

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  /** Bir dona uchun bonus ("Bonus $"), hujjat valyutasida. */
  bonusPerUnit: number;
  /** Qator bonusi foizda ("Bonus %"). */
  bonusPercent: number;
}

export type CartItemField = 'quantity' | 'unitPrice' | 'bonusPerUnit' | 'bonusPercent';

/**
 * Yangi qatorning boshlang'ich narxi.
 *
 * <p>Mahsulotning xarid narxi bo'lsa — o'sha. Bo'lmasa (yoki nol bo'lsa)
 * sotuv narxining 70% i taxmin sifatida olinadi: kassir noldan boshlab
 * kiritgandan ko'ra, yaqin qiymatni tuzatgani qulay.
 *
 * <p>Natija BUTUN so'mga yaxlitlanadi. So'mning kasr qismi amalda
 * ishlatilmaydi, lekin 70% hisobi uni osongina hosil qiladi
 * (999 999 -> 699 999.2999999999). Bunday qiymat `DECIMAL(15,2)` ustunga
 * yozilib, xarid summasiga va mahsulotning tannarxiga o'tardi — tannarx
 * esa FOYDA hisobiga kiradi.
 */
export function initialUnitPrice(product: Product): number {
  return product.purchasePrice || Math.round(product.sellingPrice * 0.7);
}

/**
 * Mahsulot savatda bo'lsa miqdorini oshiradi, bo'lmasa yangi qator qo'shadi.
 *
 * @param unitPrice yangi qator narxi (hujjat valyutasida); berilmasa so'mdagi
 *                  taxmin ({@link initialUnitPrice}).
 */
export function addToCart(items: CartItem[], product: Product, unitPrice?: number): CartItem[] {
  const existing = items.find((item) => item.product.id === product.id);
  if (existing) {
    return items.map((item) =>
      item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
    );
  }
  return [
    ...items,
    {
      product,
      quantity: 1,
      unitPrice: unitPrice ?? initialUnitPrice(product),
      bonusPerUnit: 0,
      bonusPercent: 0,
    },
  ];
}

export function updateCartItem(
  items: CartItem[],
  productId: number,
  field: CartItemField,
  value: number
): CartItem[] {
  return items.map((item) =>
    item.product.id === productId ? { ...item, [field]: value } : item
  );
}

export function removeFromCart(items: CartItem[], productId: number): CartItem[] {
  return items.filter((item) => item.product.id !== productId);
}

/** Tovar summasi bonusgacha (hujjat valyutasida). */
export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

export function cartTotalQuantity(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

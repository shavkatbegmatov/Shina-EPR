/**
 * React Query kalitlari — yagona manba.
 *
 * <p>Kalitlar sahifalarda qo'lda yozilganda (`['suppliers', search]`) ikki xil
 * xato tug'iladi: bir joyda `'suppliers'`, boshqasida `'supplier'` deb yozilsa
 * invalidatsiya JIMGINA o'tkazib yuboriladi — ekran eski ma'lumot bilan qolib,
 * hech qanday xato ko'rinmaydi. Bu yerda kalitlar bitta joyda va tiplangan.
 *
 * <p>Ierarxiya muhim: `invalidateQueries({ queryKey: keys.suppliers.all })`
 * ostidagi barcha sahifalangan/filtrlangan so'rovlarni ham bekor qiladi,
 * chunki React Query kalitni PREFIKS bo'yicha solishtiradi.
 */

export interface SupplierListParams {
  page: number;
  size: number;
  search?: string;
}

export interface PurchaseListParams {
  page: number;
  size: number;
}

export const queryKeys = {
  suppliers: {
    all: ['suppliers'] as const,
    list: (params: SupplierListParams) => ['suppliers', 'list', params] as const,
    /** Dropdown uchun barcha faol ta'minotchilar. */
    active: () => ['suppliers', 'active'] as const,
    stats: () => ['suppliers', 'stats'] as const,
    detail: (id: number) => ['suppliers', 'detail', id] as const,
  },

  purchases: {
    all: ['purchases'] as const,
    list: (params: PurchaseListParams) => ['purchases', 'list', params] as const,
    stats: () => ['purchases', 'stats'] as const,
    detail: (id: number) => ['purchases', 'detail', id] as const,
  },

  products: {
    all: ['products'] as const,
    search: (term: string) => ['products', 'search', term] as const,
  },
} as const;

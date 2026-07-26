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

export interface ProductListParams {
  page: number;
  size: number;
  search?: string;
  brandId?: number;
  categoryId?: number;
  season?: string;
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
    list: (params: ProductListParams) => ['products', 'list', params] as const,
    search: (term: string) => ['products', 'search', term] as const,
  },

  brands: {
    all: ['brands'] as const,
    list: () => ['brands', 'list'] as const,
  },

  categories: {
    all: ['categories'] as const,
    tree: () => ['categories', 'tree'] as const,
    /** Kategoriyaning meros bilan hisoblangan atributlari. */
    attributes: (id: number) => ['categories', 'attributes', id] as const,
  },

  attributes: {
    all: ['attributes'] as const,
    list: () => ['attributes', 'list'] as const,
  },
} as const;

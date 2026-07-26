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
    payments: (id: number) => ['purchases', 'payments', id] as const,
    returns: (id: number) => ['purchases', 'returns', id] as const,
  },

  products: {
    all: ['products'] as const,
    list: (params: ProductListParams) => ['products', 'list', params] as const,
    search: (term: string) => ['products', 'search', term] as const,
    detail: (id: number) => ['products', 'detail', id] as const,
  },

  employees: {
    all: ['employees'] as const,
    list: (params: { page: number; size: number; search?: string }) =>
      ['employees', 'list', params] as const,
    detail: (id: number) => ['employees', 'detail', id] as const,
    stats: () => ['employees', 'stats'] as const,
    /** Xodimga bog'lash uchun band bo'lmagan foydalanuvchilar. */
    availableUsers: () => ['employees', 'available-users'] as const,
  },

  roles: {
    all: ['roles'] as const,
    list: () => ['roles', 'list'] as const,
  },

  auditLogs: {
    all: ['audit-logs'] as const,
    list: (params: {
      mode: 'grouped' | 'simple';
      page: number;
      entityType?: string;
      action?: string;
      search?: string;
    }) => ['audit-logs', 'list', params] as const,
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

  warehouse: {
    all: ['warehouse'] as const,
    stats: () => ['warehouse', 'stats'] as const,
    movements: (params: { page: number; size: number; type?: string }) =>
      ['warehouse', 'movements', params] as const,
    lowStock: () => ['warehouse', 'low-stock'] as const,
  },

  expenses: {
    all: ['expenses'] as const,
    list: (params: { page: number; size: number; startDate: string; endDate: string; category?: string }) =>
      ['expenses', 'list', params] as const,
  },

  shifts: {
    all: ['shifts'] as const,
    current: () => ['shifts', 'current'] as const,
    history: () => ['shifts', 'history'] as const,
  },

  settings: {
    all: ['settings'] as const,
    detail: () => ['settings', 'detail'] as const,
  },

  customers: {
    all: ['customers'] as const,
    list: (params: { page: number; size: number; search?: string }) =>
      ['customers', 'list', params] as const,
    detail: (id: number) => ['customers', 'detail', id] as const,
  },

  debts: {
    all: ['debts'] as const,
    list: (params: { page: number; size: number; status?: string }) =>
      ['debts', 'list', params] as const,
    /** Statistika uchun sahifalanmagan to'liq ro'yxat. */
    forStats: () => ['debts', 'for-stats'] as const,
    totalActive: () => ['debts', 'total-active'] as const,
    payments: (debtId: number) => ['debts', 'payments', debtId] as const,
    detail: (id: number) => ['debts', 'detail', id] as const,
  },

  sales: {
    all: ['sales'] as const,
    list: (params: { page: number; size: number; startDate?: string; endDate?: string }) =>
      ['sales', 'list', params] as const,
    detail: (id: number) => ['sales', 'detail', id] as const,
    /** Savdo bo'yicha qaytarishlar tarixi. */
    returns: (id: number) => ['sales', 'returns', id] as const,
  },
} as const;

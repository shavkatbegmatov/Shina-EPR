/**
 * So'rov "yangiligi" muddatlari (`staleTime`).
 *
 * <p>`staleTime` — ma'lumot QANCHA VAQT yangi hisoblanishi. Shu muddat ichida
 * komponent qayta mount bo'lsa yoki kalit qaytadan ishlatilsa, serverga
 * so'rov YUBORILMAYDI — kesh beriladi. Muddat o'tgach keyingi mount fonda
 * yangilaydi.
 *
 * <p>Bu ERPda bir vaqtda bir necha kassir ishlaydi, shuning uchun bir xil
 * qiymat hammaga to'g'ri kelmaydi: ma'lumotning ESKIRISHI qanchalik
 * qimmatga tushishiga qarab tanlanadi.
 *
 * <p>MUHIM: `staleTime` invalidatsiyaga TA'SIR QILMAYDI. Mutatsiyadan keyin
 * `invalidateQueries` chaqirilsa, ma'lumot muddatidan qat'i nazar darhol
 * qayta olinadi. Ya'ni o'z o'zgarishingiz har doim ko'rinadi — `staleTime`
 * faqat BOSHQA sabablarga ko'ra qayta so'rashni kamaytiradi.
 */

import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';

const MINUTE = 60 * 1000;

export const staleTime = {
  /**
   * Ma'lumotnoma: brendlar, kategoriyalar, atributlar, rollar, sozlamalar.
   *
   * <p>Oyiga bir necha marta o'zgaradi. Har sahifa almashganda qayta so'rash
   * sof isrof edi. Tahrirlanganda invalidatsiya baribir darhol yangilaydi.
   */
  reference: 10 * MINUTE,

  /**
   * Hisobot va boshqaruv paneli — og'ir agregatlar.
   *
   * <p>Ular baribir bir necha soniya oldingi holatni ko'rsatadi (server
   * hisoblab chiqadi), shuning uchun bir daqiqalik eskirish sezilmaydi.
   * Yangi savdo bo'lganda WebSocket invalidatsiya qiladi.
   */
  reports: MINUTE,

  /**
   * Tranzaksion ro'yxatlar: savdolar, xaridlar, qarzlar, mijozlar.
   *
   * <p>Qisqa muddat: boshqa kassir yozuv qo'shgan bo'lishi mumkin, lekin
   * ro'yxatni har ochganda qayta so'rash ham ortiqcha. 30 soniya — sahifalar
   * orasida tez yurishni qoplaydi, undan uzoq turgan ma'lumot esa
   * yangilanadi.
   */
  transactional: 30 * 1000,

  /**
   * ZAXIRAGA bog'liq ma'lumot — HECH QACHON keshlanmaydi.
   *
   * <p>POS'dagi mahsulot ro'yxati va ombor qoldiqlari. Eskirgan zaxira soni
   * kassirni yo'q tovarni sotishga undaydi: savdo serverda rad etiladi va
   * mijoz oldida noqulay holat yuzaga keladi. Bu yerda tezlikdan ko'ra
   * to'g'rilik muhim.
   */
  stock: 0,
} as const;

/**
 * Har bir domen uchun muddat.
 *
 * <p>Tip `Record<keyof typeof queryKeys, number>` — ATAYLAB. `queryKeys` ga
 * yangi domen qo'shilsa, bu jadval to'ldirilmaguncha loyiha KOMPILYATSIYA
 * BO'LMAYDI. Aks holda yangi so'rov jimgina 0 muddat bilan qolib ketardi va
 * buni hech kim sezmasdi.
 */
const DOMAIN_STALE_TIME: Record<keyof typeof queryKeys, number> = {
  // Ma'lumotnoma
  brands: staleTime.reference,
  categories: staleTime.reference,
  attributes: staleTime.reference,
  roles: staleTime.reference,
  settings: staleTime.reference,
  // Ruxsatlar katalogi kodda e'lon qilinadi — ishlash paytida o'zgarmaydi.
  permissions: staleTime.reference,

  // Hisobotlar
  dashboard: staleTime.reports,
  reports: staleTime.reports,

  // Tranzaksion
  suppliers: staleTime.transactional,
  purchases: staleTime.transactional,
  employees: staleTime.transactional,
  auditLogs: staleTime.transactional,
  expenses: staleTime.transactional,
  shifts: staleTime.transactional,
  profile: staleTime.transactional,
  customers: staleTime.transactional,
  debts: staleTime.transactional,
  sales: staleTime.transactional,
  shopOrders: staleTime.transactional,

  // Zaxira
  products: staleTime.stock,
  warehouse: staleTime.stock,
};

/** React Query'ning `gcTime` sukut qiymati. */
const DEFAULT_GC_TIME = 5 * MINUTE;

function gcTimeFor(stale: number): number {
  // `gcTime` `staleTime` dan kichik bo'lsa, kesh muddat tugashidan OLDIN
  // tozalanadi — ya'ni 10 daqiqalik "yangilik" amalda 5 daqiqa ishlaydi.
  // Shuning uchun tozalash muddati har doim yangilik muddatidan katta.
  return Math.max(DEFAULT_GC_TIME, stale + MINUTE);
}

/**
 * Muddatlarni domen PREFIKSI bo'yicha ro'yxatdan o'tkazadi.
 *
 * <p>Har bir `useQuery` ga qo'lda `staleTime` yozish o'rniga shu yagona joy
 * ishlatiladi: React Query kalitni prefiks bo'yicha solishtiradi, ya'ni
 * `['products']` ro'yxati `['products', 'list', ...]` va
 * `['products', 'search', ...]` ga ham tegishli. Bu invalidatsiya
 * ishlatadigan ierarxiyaning AYNAN o'zi, shuning uchun ikkalasi bir joydan
 * boshqariladi va yangi so'rov avtomatik to'g'ri muddatni oladi.
 *
 * <p>`useQuery` ga bevosita berilgan `staleTime` bu yerdagidan ustun turadi —
 * alohida holat kerak bo'lsa, sahifada yozib ketish mumkin.
 */
export function configureQueryDefaults(client: QueryClient): void {
  for (const domain of Object.keys(DOMAIN_STALE_TIME) as Array<keyof typeof queryKeys>) {
    const stale = DOMAIN_STALE_TIME[domain];
    client.setQueryDefaults(queryKeys[domain].all, {
      staleTime: stale,
      gcTime: gcTimeFor(stale),
    });
  }
}

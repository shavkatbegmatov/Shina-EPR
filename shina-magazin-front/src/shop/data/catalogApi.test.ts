import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn() },
}));

import api from '../../api/axios';
import { catalogApi } from './catalogApi';

/**
 * Vitrina filtrlarining SERVERGA uzatilishi.
 *
 * <p>Filtrning brauzerda qolib ketishi jimgina noto'g'ri natija beradi: server
 * bir sahifa qaytaradi, brauzer uni filtrlaydi va foydalanuvchi "shu brendda
 * shuncha mahsulot bor ekan" deb o'ylaydi. Shuning uchun har bir filtr
 * so'rovga tushishi alohida qulflanadi.
 */

function mockEmptyPage() {
  vi.mocked(api.get).mockResolvedValue({
    data: { data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 200 } },
  });
}

/** Oxirgi so'rov URL'idan query parametrlar. */
function lastQuery(): URLSearchParams {
  const url = vi.mocked(api.get).mock.calls.at(-1)?.[0] as string;
  return new URLSearchParams(url.split('?')[1] ?? '');
}

describe('catalogApi.listFiltered', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmptyPage();
  });

  it('brendni ID sifatida serverga uzatadi', async () => {
    await catalogApi.listFiltered({ brandId: 7 });

    expect(lastQuery().get('brandId')).toBe('7');
  });

  it('brend tanlanmagan bo\'lsa parametr yuborilmaydi', async () => {
    await catalogApi.listFiltered({ search: 'michelin' });

    expect(lastQuery().has('brandId')).toBe(false);
  });

  it('o\'lcham va qidiruv ham serverga ketadi', async () => {
    await catalogApi.listFiltered({ search: '205/55R16', width: 205, profile: 55, diameter: 16 });

    const q = lastQuery();
    expect(q.get('search')).toBe('205/55R16');
    expect(q.get('width')).toBe('205');
    expect(q.get('profile')).toBe('55');
    expect(q.get('diameter')).toBe('16');
  });

  it('bo\'sh filtrlar bilan ham ishlaydi', async () => {
    await catalogApi.listFiltered({});

    expect(lastQuery().get('size')).toBe('200');
  });
});

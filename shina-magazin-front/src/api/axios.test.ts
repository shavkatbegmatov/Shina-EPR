import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

const logout = vi.fn();
vi.mock('../store/authStore', () => ({
  useAuthStore: { getState: () => ({ logout }) },
}));

import api from './axios';

/**
 * 401 interceptor'ining single-flight xossasi.
 *
 * Server refresh tokenni har chaqiruvda rotatsiya qiladi va eskisi qayta
 * kelsa BUTUN sessiyani yopadi (o'g'irlangan token himoyasi). Dedup bo'lmasa
 * sahifadagi parallel so'rovlar shu himoyani o'ziga qarshi ishlatib, har
 * token muddati tugashida foydalanuvchini chiqarib yuborardi.
 */

interface AdapterState {
  refreshCalls: number;
}

const authHeaderOf = (config: InternalAxiosRequestConfig) => {
  const headers = config.headers;
  if (!headers) return '';
  const direct = headers.Authorization;
  if (direct) return String(direct);
  return typeof headers.get === 'function' ? String(headers.get('Authorization') ?? '') : '';
};

/** Eski token bilan kelgan so'rovga 401, refresh'ga yangi juftlik. */
const makeAdapter = (state: AdapterState): AxiosAdapter => async (config) => {
  if (String(config.url ?? '').includes('/auth/refresh-token')) {
    state.refreshCalls++;
    // Javob darhol kelmaydi — parallel so'rovlar poyga oynasiga tushsin
    await new Promise((resolve) => setTimeout(resolve, 10));
    return {
      data: { data: { accessToken: 'new-access', refreshToken: 'new-refresh' } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  }

  if (authHeaderOf(config) === 'Bearer old-access') {
    throw new AxiosError('Unauthorized', AxiosError.ERR_BAD_REQUEST, config, undefined, {
      status: 401,
      data: {},
      statusText: 'Unauthorized',
      headers: {},
      config,
    });
  }

  return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
};

describe('axios 401 interceptor — single-flight refresh', () => {
  let state: AdapterState;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('accessToken', 'old-access');
    localStorage.setItem('refreshToken', 'old-refresh');

    state = { refreshCalls: 0 };
    api.defaults.adapter = makeAdapter(state);
    axios.defaults.adapter = makeAdapter(state);
  });

  it("parallel 401 so'rovlar uchun BITTA refresh yuboriladi", async () => {
    const results = await Promise.all([
      api.get('/v1/dashboard/stats'),
      api.get('/v1/dashboard/chart'),
      api.get('/v1/staff-registration/pending-count'),
    ]);

    expect(state.refreshCalls)
      .toBe(1);
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(localStorage.getItem('accessToken')).toBe('new-access');
    expect(localStorage.getItem('refreshToken')).toBe('new-refresh');
    expect(logout).not.toHaveBeenCalled();
  });

  it('keyingi muddat tugashi yangi refresh yuboradi (qulf tiqilib qolmaydi)', async () => {
    await api.get('/v1/dashboard/stats');
    expect(state.refreshCalls).toBe(1);

    // Token yana eskirdi
    localStorage.setItem('accessToken', 'old-access');
    await api.get('/v1/dashboard/stats');

    expect(state.refreshCalls).toBe(2);
  });
});

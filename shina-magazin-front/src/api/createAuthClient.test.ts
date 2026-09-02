import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { createAuthClient } from './createAuthClient';

/**
 * Mijoz (portal/do'kon) klientlari uchun ham single-flight refresh.
 *
 * ERP klientida dedup bor edi, mijoz klientlari esa nusxa-ko'chirilgan 401
 * handler bilan yurar edi — kabinet sahifasi ochilganda 2-3 parallel so'rov
 * bir xil refresh tokenni ikki marta yuborib, sessiyani yopib qo'yardi.
 */

interface AdapterState {
  refreshCalls: number;
  refreshBodies: unknown[];
}

const authHeaderOf = (config: InternalAxiosRequestConfig) => {
  const headers = config.headers;
  if (!headers) return '';
  const direct = headers.Authorization;
  if (direct) return String(direct);
  return typeof headers.get === 'function' ? String(headers.get('Authorization') ?? '') : '';
};

const makeAdapter = (state: AdapterState): AxiosAdapter => async (config) => {
  if (String(config.url ?? '').includes('/customer-auth/refresh-token')) {
    state.refreshCalls++;
    state.refreshBodies.push(config.data);
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

describe('createAuthClient — mijoz sessiyasi', () => {
  let state: AdapterState;
  const onSessionLost = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('portalAccessToken', 'old-access');
    localStorage.setItem('portalRefreshToken', 'old-refresh');
    state = { refreshCalls: 0, refreshBodies: [] };
    axios.defaults.adapter = makeAdapter(state);
  });

  const makeClient = () => {
    const client = createAuthClient({
      accessTokenKey: 'portalAccessToken',
      refreshTokenKey: 'portalRefreshToken',
      refreshPath: '/v1/customer-auth/refresh-token',
      onSessionLost,
    });
    client.defaults.adapter = makeAdapter(state);
    return client;
  };

  it("parallel 401 so'rovlar uchun BITTA refresh yuboriladi va token JSON body'da ketadi", async () => {
    const client = makeClient();

    const results = await Promise.all([
      client.get('/v1/portal/dashboard'),
      client.get('/v1/portal/purchases'),
      client.get('/v1/portal/notifications/unread-count'),
    ]);

    expect(state.refreshCalls).toBe(1);
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(localStorage.getItem('portalAccessToken')).toBe('new-access');
    expect(localStorage.getItem('portalRefreshToken')).toBe('new-refresh');
    expect(JSON.parse(String(state.refreshBodies[0]))).toEqual({ refreshToken: 'old-refresh' });
    expect(onSessionLost).not.toHaveBeenCalled();
  });

  it("ikki alohida klient (kabinet + do'kon) bitta refresh'ni bo'lishadi", async () => {
    const portal = makeClient();
    const shop = makeClient();

    await Promise.all([portal.get('/v1/portal/dashboard'), shop.get('/v1/account/orders')]);

    expect(state.refreshCalls).toBe(1);
  });

  it('refresh token yo\'q bo\'lsa onSessionLost chaqiriladi', async () => {
    localStorage.removeItem('portalRefreshToken');
    const client = makeClient();

    await expect(client.get('/v1/portal/dashboard')).rejects.toBeDefined();

    expect(state.refreshCalls).toBe(0);
    expect(onSessionLost).toHaveBeenCalledWith('no-refresh-token', expect.anything());
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useInvalidateOnNotification } from './useInvalidateOnNotification';
import { useNotificationsStore } from '../store/notificationsStore';
import type { Notification } from '../store/notificationsStore';

/**
 * WebSocket bildirishnomasida so'rovlarni yangilash.
 *
 * <p>Bu hook ilgari har bir sahifada takrorlangan effektning o'rnini bosadi.
 * Ikki xato jimgina o'tib ketardi: yangilash umuman ishlamasligi (ekran eski
 * ma'lumot bilan qoladi) va cheksiz sikl (kalitlar massivi har renderda
 * yangi bo'lgani uchun). Ikkalasi ham shu yerda qulflanadi.
 */

function notification(id: number): Notification {
  return {
    id,
    title: 'Yangi buyurtma',
    message: 'PR-1',
    type: 'order',
    isRead: false,
    createdAt: '2026-03-15T10:00:00Z',
  };
}

function setup(keys: unknown[][]) {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue();

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  const view = renderHook(({ k }) => useInvalidateOnNotification(k), {
    wrapper,
    initialProps: { k: keys },
  });

  return { invalidate, view };
}

describe('useInvalidateOnNotification', () => {
  beforeEach(() => {
    useNotificationsStore.setState({ notifications: [] });
  });

  it('bildirishnoma yo\'q bo\'lsa hech narsa qilmaydi', () => {
    const { invalidate } = setup([['suppliers']]);

    expect(invalidate).not.toHaveBeenCalled();
  });

  it('bildirishnoma kelganda berilgan kalitlarni bekor qiladi', () => {
    const { invalidate, view } = setup([['suppliers'], ['purchases']]);

    useNotificationsStore.setState({ notifications: [notification(1)] });
    view.rerender({ k: [['suppliers'], ['purchases']] });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['suppliers'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['purchases'] });
  });

  // Kalitlar massivi har renderda YANGI obyekt bo'ladi. Uni effekt
  // bog'liqligiga qo'ysak har invalidatsiya render tug'dirib, render yana
  // invalidatsiya chaqirib — cheksiz sikl chiqardi.
  it('kalitlar massivi har renderda yangi bo`lsa ham qayta chaqirmaydi', () => {
    const { invalidate, view } = setup([['suppliers']]);

    useNotificationsStore.setState({ notifications: [notification(1)] });
    view.rerender({ k: [['suppliers']] });
    const afterFirst = invalidate.mock.calls.length;

    // Yangi massiv identifikatori, lekin bildirishnomalar soni o'zgarmagan
    view.rerender({ k: [['suppliers']] });
    view.rerender({ k: [['suppliers']] });

    expect(invalidate.mock.calls.length).toBe(afterFirst);
  });

  it('yangi bildirishnoma kelganda qaytadan bekor qiladi', () => {
    const { invalidate, view } = setup([['suppliers']]);

    useNotificationsStore.setState({ notifications: [notification(1)] });
    view.rerender({ k: [['suppliers']] });
    const afterFirst = invalidate.mock.calls.length;

    useNotificationsStore.setState({ notifications: [notification(1), notification(2)] });
    view.rerender({ k: [['suppliers']] });

    expect(invalidate.mock.calls.length).toBeGreaterThan(afterFirst);
  });
});

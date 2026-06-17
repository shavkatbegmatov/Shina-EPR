import { describe, it, expect, beforeEach } from 'vitest';
import { useRecentStore } from './recentStore';

describe('recentStore', () => {
  beforeEach(() => useRecentStore.getState().clear());

  it('add eng yangi ID ni boshiga qo\'yadi', () => {
    const { add } = useRecentStore.getState();
    add(1);
    add(2);
    add(3);
    expect(useRecentStore.getState().ids).toEqual([3, 2, 1]);
  });

  it('add mavjud ID ni boshiga ko\'taradi (dublikatsiz)', () => {
    const { add } = useRecentStore.getState();
    add(1);
    add(2);
    add(1);
    expect(useRecentStore.getState().ids).toEqual([1, 2]);
  });

  it('eng ko\'pi 8 ta ID saqlaydi (eng eskisi tushib qoladi)', () => {
    const { add } = useRecentStore.getState();
    for (let i = 1; i <= 10; i++) add(i);
    const { ids } = useRecentStore.getState();
    expect(ids).toHaveLength(8);
    expect(ids[0]).toBe(10);
    expect(ids).not.toContain(1);
    expect(ids).not.toContain(2);
  });

  it('clear tozalaydi', () => {
    useRecentStore.getState().add(1);
    useRecentStore.getState().clear();
    expect(useRecentStore.getState().ids).toEqual([]);
  });
});

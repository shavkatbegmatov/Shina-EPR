import { describe, it, expect, beforeEach } from 'vitest';
import { useCompareStore, selectCompareCount, COMPARE_MAX } from './compareStore';

describe('compareStore', () => {
  beforeEach(() => useCompareStore.getState().clear());

  it('toggle ID ni qo\'shadi va true qaytaradi', () => {
    expect(useCompareStore.getState().toggle(1)).toBe(true);
    expect(useCompareStore.getState().ids).toEqual([1]);
  });

  it('toggle mavjud ID ni olib tashlaydi va true qaytaradi', () => {
    useCompareStore.getState().toggle(1);
    expect(useCompareStore.getState().toggle(1)).toBe(true);
    expect(useCompareStore.getState().ids).toEqual([]);
  });

  it(`MAX (${COMPARE_MAX}) dan oshganda qo\'shmaydi va false qaytaradi`, () => {
    const { toggle } = useCompareStore.getState();
    for (let i = 1; i <= COMPARE_MAX; i++) toggle(i);
    expect(useCompareStore.getState().ids).toHaveLength(COMPARE_MAX);
    expect(useCompareStore.getState().toggle(COMPARE_MAX + 1)).toBe(false);
    expect(useCompareStore.getState().ids).toHaveLength(COMPARE_MAX);
  });

  it('remove va clear ishlaydi', () => {
    const { toggle, remove, clear } = useCompareStore.getState();
    toggle(1);
    toggle(2);
    remove(1);
    expect(useCompareStore.getState().ids).toEqual([2]);
    clear();
    expect(useCompareStore.getState().ids).toEqual([]);
  });

  it('selectCompareCount sonni qaytaradi', () => {
    useCompareStore.getState().toggle(1);
    expect(selectCompareCount(useCompareStore.getState())).toBe(1);
  });
});

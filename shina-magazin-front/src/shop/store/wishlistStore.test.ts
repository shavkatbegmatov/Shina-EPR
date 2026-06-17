import { describe, it, expect, beforeEach } from 'vitest';
import { useWishlistStore, selectWishlistCount } from './wishlistStore';

describe('wishlistStore', () => {
  beforeEach(() => useWishlistStore.getState().clear());

  it('toggle ID ni qo\'shadi (eng yangisi birinchi)', () => {
    const { toggle } = useWishlistStore.getState();
    toggle(1);
    toggle(2);
    expect(useWishlistStore.getState().ids).toEqual([2, 1]);
  });

  it('toggle mavjud ID ni olib tashlaydi', () => {
    const { toggle } = useWishlistStore.getState();
    toggle(1);
    toggle(2);
    toggle(1);
    expect(useWishlistStore.getState().ids).toEqual([2]);
  });

  it('remove ID ni olib tashlaydi', () => {
    const { toggle, remove } = useWishlistStore.getState();
    toggle(1);
    toggle(2);
    remove(2);
    expect(useWishlistStore.getState().ids).toEqual([1]);
  });

  it('clear hammasini tozalaydi', () => {
    const { toggle, clear } = useWishlistStore.getState();
    toggle(1);
    clear();
    expect(useWishlistStore.getState().ids).toEqual([]);
  });

  it('selectWishlistCount sonni qaytaradi', () => {
    const { toggle } = useWishlistStore.getState();
    toggle(1);
    toggle(2);
    expect(selectWishlistCount(useWishlistStore.getState())).toBe(2);
  });
});

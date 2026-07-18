import { describe, it, expect, beforeEach } from 'vitest';
import {
  useOrderStore,
  calcDeliveryFee,
  DELIVERY_FEE,
  FREE_DELIVERY_THRESHOLD,
  type ShopOrder,
} from './orderStore';

const mkOrder = (orderNo: string): ShopOrder => ({
  orderNo,
  createdAt: 1,
  items: [],
  contact: { name: 'Test', phone: '901234567' },
  delivery: { method: 'pickup' },
  payment: 'cash',
  subtotal: 0,
  deliveryFee: 0,
  total: 0,
});

describe('orderStore', () => {
  beforeEach(() => useOrderStore.setState({ orders: [] }));

  it('addOrder yangi buyurtmani ro\'yxat boshiga qo\'yadi', () => {
    const { addOrder } = useOrderStore.getState();
    addOrder(mkOrder('PR-1'));
    addOrder(mkOrder('PR-2'));
    expect(useOrderStore.getState().orders.map((o) => o.orderNo)).toEqual(['PR-2', 'PR-1']);
  });
});

describe('calcDeliveryFee', () => {
  it('pickup har doim bepul', () => {
    expect(calcDeliveryFee('pickup', 0)).toBe(0);
    expect(calcDeliveryFee('pickup', 5_000_000)).toBe(0);
  });

  it('delivery — chegaradan past bo\'lsa standart narx', () => {
    expect(calcDeliveryFee('delivery', 0)).toBe(DELIVERY_FEE);
    expect(calcDeliveryFee('delivery', FREE_DELIVERY_THRESHOLD - 1)).toBe(DELIVERY_FEE);
  });

  it('delivery — chegara yoki undan yuqori bo\'lsa bepul', () => {
    expect(calcDeliveryFee('delivery', FREE_DELIVERY_THRESHOLD)).toBe(0);
    expect(calcDeliveryFee('delivery', FREE_DELIVERY_THRESHOLD + 1)).toBe(0);
  });
});

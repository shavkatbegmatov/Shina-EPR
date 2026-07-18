import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./shopAccountAxios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import api from './shopAccountAxios';
import { ordersApi, type CreateOrderPayload } from './ordersApi';

const payload: CreateOrderPayload = {
  items: [{ productId: 1, quantity: 2 }],
  name: 'Test Mijoz',
  phone: '+998901234567',
  deliveryMethod: 'delivery',
  payment: 'cash',
};

describe('ordersApi.create', () => {
  beforeEach(() => vi.clearAllMocks());

  it('backend enumlarini katta harfda yuboradi', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { data: { orderNo: 'PR-1', status: 'NEW', subtotal: 100, deliveryFee: 0, totalAmount: 100 } },
    });

    await ordersApi.create(payload);

    expect(api.post).toHaveBeenCalledWith('/v1/orders', expect.objectContaining({
      deliveryMethod: 'DELIVERY',
      payment: 'CASH',
    }));
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import '../../i18n'; // global i18n instance (useTranslation uchun)
import { CheckoutPage } from './CheckoutPage';
import { useCartStore } from '../store/cartStore';
import type { Product } from '../../types';

const P1: Product = {
  id: 1, sku: 'A-1', name: 'Shina A', sellingPrice: 100_000,
  quantity: 10, minStockLevel: 1, lowStock: false, active: true,
};

function renderCheckout() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('CheckoutPage validatsiya', () => {
  beforeEach(() => useCartStore.getState().clear());

  it('savat bo\'sh bo\'lsa forma maydonlari ko\'rsatilmaydi (bo\'sh holat)', () => {
    renderCheckout();
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
  });

  it('bo\'sh kontakt bilan "keyingi" bosilsa xato chiqadi va step 0 da qoladi', () => {
    useCartStore.getState().add(P1);
    const { container } = renderCheckout();
    expect(screen.getAllByRole('textbox')).toHaveLength(3); // name, phone, email
    fireEvent.click(screen.getByRole('button')); // "Keyingi"
    expect(container.querySelectorAll('.text-error').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('textbox')).toHaveLength(3); // hali step 0
  });

  it('9 raqamdan qisqa telefon xato beradi', () => {
    useCartStore.getState().add(P1);
    const { container } = renderCheckout();
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'Ali Valiyev' } });
    fireEvent.change(inputs[1], { target: { value: '123' } }); // 9 dan kam
    fireEvent.click(screen.getByRole('button'));
    expect(container.querySelectorAll('.text-error').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('textbox')).toHaveLength(3);
  });

  it('to\'g\'ri kontakt bilan yetkazib berish bosqichiga o\'tadi', () => {
    useCartStore.getState().add(P1);
    renderCheckout();
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'Ali Valiyev' } });
    fireEvent.change(inputs[1], { target: { value: '901234567' } }); // 9 raqam
    fireEvent.click(screen.getByRole('button')); // "Keyingi"
    // step 1 (yetkazib berish): address input + note textarea = 2 textbox
    expect(screen.getAllByRole('textbox')).toHaveLength(2);
  });
});

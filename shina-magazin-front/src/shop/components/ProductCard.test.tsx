import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '../../i18n'; // global i18n instance'ni init qiladi (useTranslation uchun)
import { ProductCard } from './ProductCard';
import { useCartStore } from '../store/cartStore';
import type { Product } from '../../types';

const PRODUCT: Product = {
  id: 99, sku: 'TEST-1', name: 'Test Shina X',
  brandName: 'TestBrand', sizeString: '205/55 R16',
  loadIndex: '91', speedRating: 'V', season: 'SUMMER',
  sellingPrice: 750000, quantity: 5, minStockLevel: 2, lowStock: false, active: true,
};

function renderCard(product: Product = PRODUCT) {
  return render(
    <MemoryRouter>
      <ProductCard product={product} />
    </MemoryRouter>
  );
}

describe('ProductCard', () => {
  beforeEach(() => {
    useCartStore.getState().clear();
  });

  it('mahsulot nomi, o\'lchami va brendini ko\'rsatadi', () => {
    renderCard();
    expect(screen.getByText('Test Shina X')).toBeInTheDocument();
    expect(screen.getByText('205/55 R16')).toBeInTheDocument();
    expect(screen.getByText('TestBrand')).toBeInTheDocument();
  });

  it('"Savatga" tugmasi mahsulotni savatga qo\'shadi', () => {
    renderCard();
    expect(useCartStore.getState().items).toHaveLength(0);
    fireEvent.click(screen.getByRole('button'));
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].product.id).toBe(99);
    expect(items[0].qty).toBe(1);
  });

  it('zaxira tugagan mahsulot uchun tugma o\'chiriladi', () => {
    renderCard({ ...PRODUCT, quantity: 0 });
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

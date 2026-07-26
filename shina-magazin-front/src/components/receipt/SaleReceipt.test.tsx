import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '../../i18n';
import { SaleReceipt } from './SaleReceipt';
import type { ReceiptSettings, Sale } from '../../types';

/**
 * Kassa cheki — mijozga beriladigan qog'oz. Ilgari chek chop etish umuman
 * yo'q edi (`window.print` butun kod bazasida topilmasdi), ya'ni kassa
 * cheksiz ishlardi.
 *
 * Bu testlar chekda savdoni tiklash uchun zarur ma'lumot borligini va
 * to'ldirilmagan sozlama chekni buzmasligini qulflaydi.
 */

const SALE: Sale = {
  id: 1,
  invoiceNumber: 'INV202607260001',
  customerName: 'Anvar Qodirov',
  saleDate: '2026-07-26T10:30:00',
  subtotal: 2_400_000,
  discountAmount: 200_000,
  discountPercent: 0,
  totalAmount: 2_200_000,
  paidAmount: 2_000_000,
  debtAmount: 200_000,
  paymentMethod: 'CASH',
  paymentStatus: 'PARTIAL',
  status: 'COMPLETED',
  createdByName: 'Malika',
  items: [
    {
      id: 10, productId: 5, productName: 'Michelin Primacy 4', productSku: 'MCH-1',
      sizeString: '205/55 R16', quantity: 2, unitPrice: 1_200_000, discount: 0, totalPrice: 2_400_000,
    },
  ],
};

const SETTINGS: ReceiptSettings = {
  receiptShopName: 'Protektor',
  receiptShopPhone: '+998 90 123 45 67',
  receiptShopAddress: 'Toshkent, Chilonzor 12',
  receiptFooter: 'Xaridingiz uchun rahmat!',
};

describe('SaleReceipt', () => {
  it('do\'kon sarlavhasini sozlamalardan oladi', () => {
    render(<SaleReceipt sale={SALE} settings={SETTINGS} />);

    expect(screen.getByText('Protektor')).toBeInTheDocument();
    expect(screen.getByText('+998 90 123 45 67')).toBeInTheDocument();
    expect(screen.getByText('Toshkent, Chilonzor 12')).toBeInTheDocument();
    expect(screen.getByText('Xaridingiz uchun rahmat!')).toBeInTheDocument();
  });

  it('savdoni tiklash uchun zarur ma\'lumot bor', () => {
    render(<SaleReceipt sale={SALE} settings={SETTINGS} />);

    expect(screen.getByText('INV202607260001')).toBeInTheDocument();
    expect(screen.getByText('Anvar Qodirov')).toBeInTheDocument();
    expect(screen.getByText('Malika')).toBeInTheDocument();
    expect(screen.getByText(/Michelin Primacy 4/)).toBeInTheDocument();
    expect(screen.getByText(/205\/55 R16/)).toBeInTheDocument();
  });

  // To'ldirilmagan sozlama chekni buzmasligi kerak — do'kon telefonini
  // kiritmagan bo'lsa, chekda bo'sh qator yoki "undefined" chiqmasin.
  it('bo\'sh sozlamalar chekda qator qoldirmaydi', () => {
    const { container } = render(
      <SaleReceipt sale={SALE} settings={{ receiptShopName: 'Protektor' }} />
    );

    expect(screen.getByText('Protektor')).toBeInTheDocument();
    expect(container.textContent).not.toContain('undefined');
    expect(container.textContent).not.toContain('null');
  });

  it('sozlamalarsiz ham chop etiladi (sozlamalar yuklanmagan holat)', () => {
    render(<SaleReceipt sale={SALE} />);

    expect(screen.getByText('INV202607260001')).toBeInTheDocument();
  });

  it('qarz faqat mavjud bo\'lganda ko\'rsatiladi', () => {
    const { rerender, container } = render(<SaleReceipt sale={SALE} settings={SETTINGS} />);
    expect(container.textContent).toContain('Qarz');

    rerender(
      <SaleReceipt
        sale={{ ...SALE, debtAmount: 0, paidAmount: SALE.totalAmount, paymentStatus: 'PAID' }}
        settings={SETTINGS}
      />
    );
    expect(container.textContent).not.toContain('Qarz');
  });

  it('chegirmasiz savdoda chegirma qatori chiqmaydi', () => {
    const { container } = render(
      <SaleReceipt sale={{ ...SALE, discountAmount: 0 }} settings={SETTINGS} />
    );

    expect(container.textContent).not.toContain('Chegirma');
  });

  // `#receipt-print` — @media print qoidalari aynan shu id ga bog'langan.
  // Id o'zgarsa chop etishda bo'sh sahifa chiqadi, lekin ekranda hech narsa
  // buzilmaydi — ya'ni faqat qo'lda sinaganda bilinardi.
  it('chop etish uslublari uchun #receipt-print id si bor', () => {
    const { container } = render(<SaleReceipt sale={SALE} settings={SETTINGS} />);

    expect(container.querySelector('#receipt-print')).not.toBeNull();
  });
});

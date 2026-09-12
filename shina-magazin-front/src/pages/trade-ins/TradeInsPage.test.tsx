import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../../i18n';
import type { Customer, PagedResponse, TradeIn } from '../../types';

vi.mock('../../api/tradeIns.api', () => ({
  tradeInsApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getAvailable: vi.fn(),
    accept: vi.fn(),
    cancel: vi.fn(),
  },
}));
vi.mock('../../api/customers.api', () => ({
  customersApi: { getAll: vi.fn() },
}));

import { tradeInsApi } from '../../api/tradeIns.api';
import { customersApi } from '../../api/customers.api';
import { TradeInsPage } from './TradeInsPage';
import { useAuthStore } from '../../store/authStore';

/**
 * Barter hujjatlari sahifasi — mijoz shinasini QOLDIRIB ketgan holat.
 *
 * <p>Qulflanadigan narsalar: ro'yxat holat bilan ko'rinadi; bekor qilish
 * faqat TRADE_INS_CANCEL bilan va faqat kutayotgan hujjatda (u omborga
 * kirimni qaytaradi); qabul qilish so'rovi mijoz + o'lcham qatorlari bilan
 * ketadi — kassadagi bilan bir xil shakl.
 */

const WAITING: TradeIn = {
  id: 1,
  documentNumber: 'TI-000001',
  customerId: 5,
  customerName: 'Muslihiddin aka',
  customerPhone: '+998904060036',
  acceptedAt: '2026-09-10T12:00:00+05:00',
  acceptedInSale: false,
  status: 'NEW',
  totalAmount: 600_000,
  totalQuantity: 4,
  items: [
    {
      id: 11,
      productId: 40,
      productName: 'B/U Michelin 205/55 R16',
      productSku: 'BU-205-55-R16-MICHELIN',
      quantity: 4,
      unitValue: 150_000,
      totalValue: 600_000,
      description: 'Michelin, protektor 60%',
    },
  ],
};

const APPLIED: TradeIn = {
  id: 2,
  documentNumber: 'TI-000002',
  customerId: 6,
  customerName: 'Boshqa mijoz',
  saleId: 99,
  invoiceNumber: 'INV202609110001',
  acceptedAt: '2026-09-11T09:30:00+05:00',
  acceptedInSale: true,
  status: 'APPLIED',
  totalAmount: 300_000,
  totalQuantity: 2,
  items: [],
};

function pageOf<T>(content: T[]): PagedResponse<T> {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: 1,
    first: true,
    last: true,
  } as PagedResponse<T>;
}

function renderPage(initialEntry = '/admin/trade-ins') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return render(<TradeInsPage />, { wrapper: Wrapper });
}

describe('TradeInsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    useAuthStore.setState({ permissions: new Set<string>() });
    vi.mocked(tradeInsApi.getAll).mockResolvedValue(pageOf([WAITING, APPLIED]));
    vi.mocked(tradeInsApi.getById).mockResolvedValue(WAITING);
    vi.mocked(customersApi.getAll).mockResolvedValue(pageOf([] as Customer[]));
  });

  it("hujjatlar holati bilan ko'rinadi, ruxsatsiz bekor qilish tugmasi yo'q", async () => {
    renderPage();

    expect(await screen.findByText('TI-000001')).toBeInTheDocument();
    expect(screen.getByText('TI-000002')).toBeInTheDocument();
    expect(screen.getAllByText('Kutmoqda').length).toBeGreaterThan(0);
    expect(screen.getByText('Savdoda ishlatilgan')).toBeInTheDocument();
    // Ishlatilgan hujjat savdosiga havola
    expect(screen.getByRole('link', { name: 'INV202609110001' })).toHaveAttribute('href', '/admin/sales/99');

    expect(screen.queryByRole('button', { name: /Bekor qilish/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Eski shina qabul qilish/i })).toBeNull();
  });

  it('holat filtri serverga uzatiladi', async () => {
    renderPage();
    await screen.findByText('TI-000001');

    // Holat tanlagichi (combobox) ochiladi, "Kutmoqda" varianti tanlanadi
    fireEvent.click(screen.getByRole('combobox', { name: 'Holat' }));
    const options = await screen.findAllByRole('option');
    const waiting = options.find((el) => el.textContent?.trim() === 'Kutmoqda') as HTMLElement;
    fireEvent.click(waiting);

    await waitFor(() =>
      expect(tradeInsApi.getAll).toHaveBeenCalledWith(expect.objectContaining({ status: 'NEW', page: 0 }))
    );
  });

  it('bekor qilish faqat kutayotgan hujjatda va tasdiqlashdan keyin', async () => {
    useAuthStore.setState({ permissions: new Set(['TRADE_INS_CANCEL']) });
    vi.mocked(tradeInsApi.cancel).mockResolvedValue({ ...WAITING, status: 'CANCELLED' });
    renderPage();
    await screen.findByText('TI-000001');

    // APPLIED qatorda tugma yo'q — jadvalda faqat bitta
    const cancelButtons = screen.getAllByRole('button', { name: /Bekor qilish/i });
    expect(cancelButtons).toHaveLength(1);
    fireEvent.click(cancelButtons[0]);

    const dialog = await screen.findByText(/Eski shinalar mijozga qaytariladi/i);
    expect(dialog).toBeInTheDocument();
    expect(tradeInsApi.cancel).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Tasdiqlash/i }));
    await waitFor(() => expect(tradeInsApi.cancel).toHaveBeenCalledWith(1));
  });

  it("qabul qilish so'rovi mijoz va o'lcham qatorlari bilan ketadi", async () => {
    useAuthStore.setState({ permissions: new Set(['TRADE_INS_CREATE']) });
    vi.mocked(customersApi.getAll).mockResolvedValue(
      pageOf([{ id: 5, fullName: 'Muslihiddin aka', phone: '+998904060036' } as Customer])
    );
    vi.mocked(tradeInsApi.accept).mockResolvedValue(WAITING);
    renderPage();
    await screen.findByText('TI-000001');

    fireEvent.click(screen.getByRole('button', { name: /Eski shina qabul qilish/i }));
    const modal = await screen.findByText(/savdodan alohida qabul qilish/i);
    expect(modal).toBeInTheDocument();

    // Mijozsiz va qatorsiz yuborib bo'lmaydi
    const submit = screen.getAllByRole('button', { name: /Eski shina qabul qilish/i }).at(-1) as HTMLElement;
    expect(submit).toBeDisabled();

    // Mijoz kombobozdan tanlanadi
    fireEvent.change(screen.getByLabelText('Mijoz'), { target: { value: 'Mus' } });
    const option = await screen.findByRole('option', { name: /Muslihiddin aka/i }, { timeout: 3000 });
    fireEvent.click(option);

    // Eski shina qatori — kassadagi oyna bilan bir xil
    fireEvent.click(screen.getByRole('button', { name: /Eski shina qo'shish/i }));
    fireEvent.change(await screen.findByRole('spinbutton', { name: 'Eni' }), { target: { value: '205' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Profil' }), { target: { value: '55' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Diametr (R)' }), { target: { value: '16' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Soni' }), { target: { value: '4' } });
    const creditInput = screen.getAllByRole('textbox').find((el) =>
      el.closest('.form-control')?.textContent?.includes('Qabul narxi')
    ) as HTMLInputElement;
    fireEvent.change(creditInput, { target: { value: '150000' } });
    fireEvent.click(screen.getByRole('button', { name: /^Qo'shish$/i }));

    await waitFor(() => expect(screen.getAllByText(/205\/55 R16/).length).toBeGreaterThan(0));
    fireEvent.change(screen.getByLabelText('Izoh'), { target: { value: '3 kundan keyin keladi' } });

    const enabledSubmit = screen.getAllByRole('button', { name: /Eski shina qabul qilish/i }).at(-1) as HTMLElement;
    await waitFor(() => expect(enabledSubmit).not.toBeDisabled());
    fireEvent.click(enabledSubmit);

    await waitFor(() => expect(tradeInsApi.accept).toHaveBeenCalled());
    expect(tradeInsApi.accept).toHaveBeenCalledWith({
      customerId: 5,
      items: [
        {
          width: 205,
          profile: 55,
          diameter: 16,
          brandName: undefined,
          condition: undefined,
          quantity: 4,
          unitValue: 150_000,
          resalePrice: 225_000,
        },
      ],
      notes: '3 kundan keyin keladi',
    });
  });

  it("savdo tafsilotidan ?doc= bilan kelinsa hujjat darhol ochiladi", async () => {
    renderPage('/admin/trade-ins?doc=1');

    await waitFor(() => expect(tradeInsApi.getById).toHaveBeenCalledWith(1));
    const title = await screen.findByText(/Barter hujjati TI-000001/i);
    const dialog = title.closest('div.rounded-2xl') as HTMLElement;
    expect(within(dialog).getByText('Michelin, protektor 60%')).toBeInTheDocument();
    expect(within(dialog).getByText('B/U Michelin 205/55 R16')).toBeInTheDocument();
  });
});

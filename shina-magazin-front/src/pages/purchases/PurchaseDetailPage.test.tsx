import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../../i18n';
import type { PurchaseOrder, PurchasePayment, PurchaseReturn } from '../../types';

vi.mock('../../api/settings.api', () => ({
  settingsApi: { get: vi.fn().mockResolvedValue({}) },
}));
vi.mock('../../api/purchases.api', () => ({
  purchasesApi: {
    getById: vi.fn(),
    getPayments: vi.fn(),
    getReturns: vi.fn(),
    addPayment: vi.fn(),
    createReturn: vi.fn(),
    approveReturn: vi.fn(),
    completeReturn: vi.fn(),
    deleteReturn: vi.fn(),
    receive: vi.fn(),
    cancel: vi.fn(),
  },
}));

import { purchasesApi } from '../../api/purchases.api';
import { PurchaseDetailPage } from './PurchaseDetailPage';
import { useAuthStore } from '../../store/authStore';
import { PermissionCode } from '../../hooks/usePermission';

/**
 * Xarid tafsiloti — xarakteristik testlar.
 *
 * <p>Sahifada BESHTA mutatsiya bor: to'lov qo'shish, qaytarish yaratish,
 * uni tasdiqlash, yakunlash va o'chirish. Ularning har biri xarid
 * summasiga yoki zaxiraga tegadi, ya'ni ekrandagi uchta ro'yxat ham
 * eskiradi. Yangilash tushib qolsa operator eski qoldiqni ko'rib, ikkinchi
 * marta to'lov kiritishi mumkin — shuning uchun aynan shu qulflanadi.
 */

const PURCHASE: PurchaseOrder = {
  id: 1,
  orderNumber: 'PO-1',
  supplierId: 3,
  supplierName: 'Alfa Shina',
  orderDate: '2026-03-15',
  status: 'RECEIVED',
  paymentStatus: 'PARTIAL',
  itemCount: 1,
  totalQuantity: 2,
  totalAmount: 2_000_000,
  paidAmount: 1_000_000,
  debtAmount: 1_000_000,
  items: [],
} as unknown as PurchaseOrder;

function renderPage(path = '/admin/purchases/1') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/purchases/:id" element={children} />
          <Route path="/admin/purchases" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return render(<PurchaseDetailPage />, { wrapper: Wrapper });
}

describe('PurchaseDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      permissions: new Set([
        PermissionCode.PURCHASES_VIEW,
        PermissionCode.PURCHASES_UPDATE,
        PermissionCode.PURCHASES_RETURN,
      ]),
    });
    Element.prototype.scrollIntoView = vi.fn();

    vi.mocked(purchasesApi.getById).mockResolvedValue(PURCHASE);
    vi.mocked(purchasesApi.getPayments).mockResolvedValue([] as PurchasePayment[]);
    vi.mocked(purchasesApi.getReturns).mockResolvedValue([] as PurchaseReturn[]);
  });

  it('xarid tafsilotini ko\'rsatadi', async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByText(/PO-1/).length).toBeGreaterThan(0));
  });

  it('xarid, to\'lovlar va qaytarishlar birga yuklanadi', async () => {
    renderPage();

    await waitFor(() => expect(purchasesApi.getById).toHaveBeenCalledWith(1));
    expect(purchasesApi.getPayments).toHaveBeenCalledWith(1);
    expect(purchasesApi.getReturns).toHaveBeenCalledWith(1);
  });

  // Bu aynan ko'chirishda tushib qolishi mumkin bo'lgan joy: to'lovdan keyin
  // qarz qoldig'i o'zgaradi, lekin ekran eski summani ko'rsatib turaversa
  // operator ikkinchi marta to'lov kiritishi mumkin.
  it('to\'lovdan keyin ma\'lumot qayta yuklanadi', async () => {
    vi.mocked(purchasesApi.addPayment).mockResolvedValue({} as PurchasePayment);
    renderPage();
    await waitFor(() => expect(screen.getAllByText(/PO-1/).length).toBeGreaterThan(0));
    const before = vi.mocked(purchasesApi.getById).mock.calls.length;

    fireEvent.click(screen.getAllByRole('button', { name: /To'lov qo'shish/i })[0]);
    const amountInputs = await screen.findAllByRole('textbox');
    fireEvent.change(amountInputs[0], { target: { value: '500000' } });
    fireEvent.click(screen.getAllByRole('button', { name: /Saqlash|To'lov qo'shish/i }).pop()!);

    await waitFor(() => expect(purchasesApi.addPayment).toHaveBeenCalled());
    await waitFor(() =>
      expect(vi.mocked(purchasesApi.getById).mock.calls.length).toBeGreaterThan(before)
    );
  });

  /**
   * ID bo'lmasa skelet aylanib QOLMAYDI.
   *
   * <p>So'rovlar `enabled: !!id` bilan to'silgan, ya'ni ID yo'q bo'lsa
   * ular ishga tushmaydi va `isPending` abadiy `true` qoladi. Skeletni
   * faqat shu bayroqqa bog'lash sahifani cheksiz yuklanayotgan holatda
   * qoldirardi.
   */
  it('ID bo\'lmasa skelet aylanib qolmaydi', async () => {
    renderPage('/admin/purchases');

    expect(await screen.findByText(/Xarid topilmadi/i)).toBeInTheDocument();
    expect(purchasesApi.getById).not.toHaveBeenCalled();
  });

  /**
   * "TEKSHIRILDI" — kutilayotgan hujjatda molni sanab qabul qilish.
   *
   * <p>Har qator uchun JAMI qabul qilingan miqdor yuboriladi: omborchi kam
   * kelgan qatorni tuzatadi, qolganlari hujjatdagi miqdorda ketadi. Bu
   * so'rov zaxira va ta'minotchi qarzini yozadi — tarkibi qulflanadi.
   */
  it('kutilayotgan hujjatda qabul qilish qator miqdorlari bilan yuboriladi', async () => {
    useAuthStore.setState({
      permissions: new Set([PermissionCode.PURCHASES_VIEW, PermissionCode.PURCHASES_RECEIVE]),
    });
    vi.mocked(purchasesApi.getById).mockResolvedValue({
      ...PURCHASE,
      status: 'ORDERED',
      totalQuantity: 16,
      items: [
        { id: 11, productId: 1, productName: 'JOYROAD 195/65 R15', productSku: 'LRG-195', quantity: 8,
          orderedQuantity: 8, receivedQuantity: 0, unitPrice: 508_000, totalPrice: 4_064_000,
          bonusPerUnit: 0, bonusPercent: 0, bonusAmount: 0, landedUnitCost: 508_000 },
        { id: 12, productId: 2, productName: 'JOYROAD 205/60 R16', productSku: 'LRG-205', quantity: 8,
          orderedQuantity: 8, receivedQuantity: 0, unitPrice: 615_950, totalPrice: 4_927_600,
          bonusPerUnit: 0, bonusPercent: 0, bonusAmount: 0, landedUnitCost: 615_950 },
      ],
    } as unknown as PurchaseOrder);
    vi.mocked(purchasesApi.receive).mockResolvedValue(PURCHASE);

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Qabul qilish \(TEKSHIRILDI\)/i }));

    // 205/60 R16 dan 2 dona yetib kelmadi
    const input = await screen.findByRole('spinbutton', { name: /JOYROAD 205\/60 R16/i });
    fireEvent.change(input, { target: { value: '6' } });
    expect(screen.getByText(/Kamomad: 2/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Qabul qilish$/i }));

    await waitFor(() => expect(purchasesApi.receive).toHaveBeenCalled());
    expect(purchasesApi.receive).toHaveBeenCalledWith(1, {
      items: [
        { itemId: 11, receivedQuantity: 8 },
        { itemId: 12, receivedQuantity: 6 },
      ],
      notes: undefined,
    });
  });

  // Qabul qilingan hujjatda "Qabul qilish" tugmasi bo'lmaydi — ikki marta
  // kirim qilib bo'lmasin.
  it('qabul qilingan hujjatda qabul qilish tugmasi ko\'rinmaydi', async () => {
    useAuthStore.setState({
      permissions: new Set([PermissionCode.PURCHASES_VIEW, PermissionCode.PURCHASES_RECEIVE]),
    });
    renderPage();

    await screen.findAllByText('PO-1');
    expect(screen.queryByRole('button', { name: /Qabul qilish \(TEKSHIRILDI\)/i })).not.toBeInTheDocument();
  });
});

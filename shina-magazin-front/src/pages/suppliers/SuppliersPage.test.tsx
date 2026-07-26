import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../../i18n';
import type { PagedResponse, PurchaseOrder, Supplier } from '../../types';

vi.mock('../../api/suppliers.api', () => ({
  suppliersApi: {
    getAll: vi.fn(),
    getActive: vi.fn(),
    getTotalDebt: vi.fn(),
    getWithDebt: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));
vi.mock('../../api/purchases.api', () => ({
  purchasesApi: { getAll: vi.fn(), getStats: vi.fn(), create: vi.fn() },
}));
vi.mock('../../api/products.api', () => ({
  productsApi: { getAll: vi.fn() },
}));

import { suppliersApi } from '../../api/suppliers.api';
import { purchasesApi } from '../../api/purchases.api';
import { SuppliersPage } from './SuppliersPage';
import { useAuthStore } from '../../store/authStore';
import { PermissionCode } from '../../hooks/usePermission';

/**
 * Ta'minotchilar sahifasi — kompozitsiya smoke testi.
 *
 * <p>Sahifa 1300 qatorli yagona komponentdan bo'limlarga bo'lingandan keyin
 * yozildi. Kompilyator proplar mosligini tekshiradi, lekin "oyna ochilganda
 * forma tozami" yoki "bo'lim almashganda kerakli so'rov ketdimi" degan
 * savollarga faqat render javob beradi.
 */

const SUPPLIER: Supplier = {
  id: 1,
  name: 'Alfa Shina',
  contactPerson: 'Anvar',
  phone: '+998901234567',
  email: 'alfa@example.com',
  address: 'Toshkent',
  balance: 0,
  hasDebt: false,
  active: true,
} as Supplier;

const PURCHASE: PurchaseOrder = {
  id: 10,
  supplierName: 'Alfa Shina',
  orderDate: '2026-03-15',
  itemCount: 2,
  totalQuantity: 5,
  totalAmount: 5_000_000,
  paidAmount: 5_000_000,
  debtAmount: 0,
  status: 'RECEIVED',
} as PurchaseOrder;

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

function renderPage() {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter>{children}</MemoryRouter>
  );
  return render(<SuppliersPage />, { wrapper: Wrapper });
}

describe('SuppliersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      permissions: new Set([
        PermissionCode.SUPPLIERS_VIEW,
        PermissionCode.SUPPLIERS_CREATE,
        PermissionCode.SUPPLIERS_UPDATE,
        PermissionCode.PURCHASES_VIEW,
        PermissionCode.PURCHASES_CREATE,
      ]),
    });
    Element.prototype.scrollIntoView = vi.fn();

    vi.mocked(suppliersApi.getAll).mockResolvedValue(pageOf([SUPPLIER]));
    vi.mocked(suppliersApi.getActive).mockResolvedValue([SUPPLIER]);
    vi.mocked(suppliersApi.getTotalDebt).mockResolvedValue(0);
    vi.mocked(suppliersApi.getWithDebt).mockResolvedValue([]);
    vi.mocked(purchasesApi.getAll).mockResolvedValue(pageOf([PURCHASE]));
    vi.mocked(purchasesApi.getStats).mockResolvedValue({
      totalPurchases: 1,
      todayPurchases: 0,
      totalAmount: 5_000_000,
      totalDebt: 0,
    } as never);
  });

  it('ta\'minotchilar ro\'yxatini yuklaydi', async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByText('Alfa Shina').length).toBeGreaterThan(0));
  });

  // Xaridlar so'rovi ATAYLAB faqat bo'lim ochilganda ketadi.
  it('xaridlar bo\'limi faqat ochilganda yuklanadi', async () => {
    renderPage();
    await waitFor(() => expect(suppliersApi.getAll).toHaveBeenCalled());
    expect(purchasesApi.getAll).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Xaridlar/i }));

    await waitFor(() => expect(purchasesApi.getAll).toHaveBeenCalled());
    expect(purchasesApi.getStats).toHaveBeenCalled();
  });

  it('yangi ta\'minotchi oynasi bo\'sh forma bilan ochiladi', async () => {
    renderPage();
    await waitFor(() => expect(suppliersApi.getAll).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /Yangi ta'minotchi/i }));

    const nameInput = await screen.findByPlaceholderText(/kompaniya/i);
    expect(nameInput).toHaveValue('');
  });

  it('tahrirlashda forma ta\'minotchi ma\'lumoti bilan to\'ladi', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText('Alfa Shina').length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByRole('button', { name: 'Tahrirlash' })[0]);

    const nameInput = await screen.findByPlaceholderText(/kompaniya/i);
    expect(nameInput).toHaveValue('Alfa Shina');
  });

  // Refaktorda forma holati sahifadan oynaga ko'chdi: `ModalPortal` yopilganda
  // bolalarini unmount qilgani uchun tozalash o'z-o'zidan bo'ladi. Agar bu
  // buzilsa, tahrirlashdan keyin "yangi" oyna eski ma'lumot bilan ochilardi
  // va foydalanuvchi bilmasdan nusxa yaratardi.
  it('tahrirlashdan keyin "yangi" oyna yana bo\'sh ochiladi', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText('Alfa Shina').length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByRole('button', { name: 'Tahrirlash' })[0]);
    expect(await screen.findByPlaceholderText(/kompaniya/i)).toHaveValue('Alfa Shina');

    fireEvent.click(screen.getByRole('button', { name: 'Bekor qilish' }));
    fireEvent.click(screen.getByRole('button', { name: /Yangi ta'minotchi/i }));

    expect(await screen.findByPlaceholderText(/kompaniya/i)).toHaveValue('');
  });

  it('yuklash xatosi ro\'yxat o\'rniga ko\'rsatiladi', async () => {
    vi.mocked(suppliersApi.getAll).mockRejectedValue(new Error('tarmoq yo\'q'));
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Qayta urinish/i })).toBeInTheDocument()
    );
  });
});

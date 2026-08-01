import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../../i18n';
import type { Employee } from '../../types';

vi.mock('../../api/employees.api', () => ({
  employeesApi: { getById: vi.fn() },
}));

import { employeesApi } from '../../api/employees.api';
import { EmployeeDetailPage } from './EmployeeDetailPage';
import { configureQueryDefaults } from '../../lib/queryConfig';

/**
 * Xodim tafsiloti — xarakteristik testlar.
 *
 * <p>Uchala tafsilot sahifasi bir xil tuzilgan, shuning uchun ular
 * bir xil TUZOQNI ham baham ko'radi: `enabled: false` bo'lganda so'rov
 * `isPending` holatida ABADIY qoladi. Skelet shu bayroqqa bog'langani
 * uchun ID bo'lmasa sahifa cheksiz yuklanayotgandek ko'rinadi.
 */

const ENTITY: Employee = {
  id: 7,
  fullName: 'Anvar Qodirov',
  phone: '+998901234567',
  position: 'Kassir',
  status: 'ACTIVE',
  hireDate: '2026-01-10',
} as unknown as Employee;

function renderPage(path = '/admin/employees/7') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  configureQueryDefaults(qc);
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/employees/:id" element={children} />
          <Route path="/admin/employees" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  render(<EmployeeDetailPage />, { wrapper: Wrapper });
  return qc;
}

describe('EmployeeDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(employeesApi.getById).mockResolvedValue(ENTITY);
  });

  it('yo\'l parametridagi ID bo\'yicha yuklaydi', async () => {
    renderPage();

    await waitFor(() => expect(employeesApi.getById).toHaveBeenCalledWith(7));
    expect(await screen.findByText('Anvar Qodirov')).toBeInTheDocument();
  });

  it('topilmasa xabar ko\'rsatiladi', async () => {
    vi.mocked(employeesApi.getById).mockRejectedValue(new Error('404'));
    renderPage();

    expect(await screen.findByText(/Xodim topilmadi/i)).toBeInTheDocument();
  });

  /**
   * ID bo\'lmasa skelet aylanib QOLMAYDI.
   *
   * <p>So\'rov `enabled: !!id` bilan to\'silgan, ya\'ni ID yo\'q bo\'lsa u
   * hech qachon ishga tushmaydi va `isPending` abadiy `true` qoladi.
   * Skeletni faqat shu bayroqqa bog\'lash sahifani cheksiz yuklanayotgan
   * holatda qoldirardi — foydalanuvchi kutib o\'tirardi, hech narsa
   * kelmasdi.
   */
  it('ID bo\'lmasa skelet aylanib qolmaydi', async () => {
    renderPage('/admin/employees');

    expect(await screen.findByText(/Xodim topilmadi/i)).toBeInTheDocument();
    expect(employeesApi.getById).not.toHaveBeenCalled();
  });
});

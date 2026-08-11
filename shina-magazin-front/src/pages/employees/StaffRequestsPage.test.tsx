import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../../i18n';
import { useAuthStore } from '../../store/authStore';
import { PermissionCode } from '../../hooks/usePermission';
import type { StaffRegistration } from '../../types';

vi.mock('../../api/staffRegistration.api', () => ({
  staffRegistrationApi: {
    getAll: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    pendingCount: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

import { staffRegistrationApi } from '../../api/staffRegistration.api';
import { StaffRequestsPage } from './StaffRequestsPage';

const REQUEST: StaffRegistration = {
  id: 1,
  fullName: 'Test Arizachi',
  phone: '+998935550011',
  // Ariza OMMAVIY formadan keladi — istalgan odam o'ziga ADMIN so'rashi mumkin
  requestedRole: 'ADMIN',
  status: 'PENDING',
  createdAt: '2026-08-11T10:00:00',
};

/**
 * Tasdiqlash oynasidagi rol tanlash.
 *
 * <p>Bu shunchaki qulaylik emas, xavfsizlik chegarasi: forma ommaviy, ya'ni
 * arizadagi rol — faqat so'rovchining istagi. Agar tugma o'sha qiymatni
 * so'zsiz yuborsa, e'tiborsiz bosilgan bitta tugma to'liq huquqli akkaunt
 * ochib qo'yardi.
 */
describe('StaffRequestsPage — tasdiqlashda rol tanlash', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      permissions: new Set([PermissionCode.EMPLOYEES_VIEW, PermissionCode.EMPLOYEES_CREATE]),
    });
    vi.mocked(staffRegistrationApi.getAll).mockResolvedValue({
      content: [REQUEST],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
      first: true,
      last: true,
    } as never);
    vi.mocked(staffRegistrationApi.approve).mockResolvedValue({ id: 7 } as never);
  });

  function renderPage() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
    render(<StaffRequestsPage />, { wrapper: Wrapper });
  }

  it('tasdiqlash darhol yubormaydi — avval oyna ochiladi', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Tasdiqlash/i }));

    expect(await screen.findByText(/Arizani tasdiqlash/i)).toBeInTheDocument();
    // Eng muhimi: hali hech narsa yuborilmagan
    expect(staffRegistrationApi.approve).not.toHaveBeenCalled();
  });

  it('so\'ralgan ADMIN o\'rniga tanlangan SELLER yuboriladi', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Tasdiqlash/i }));
    await screen.findByText(/Arizani tasdiqlash/i);

    // `Select` — mahalliy <select> emas, combobox+listbox naqshidagi
    // komponent, shuning uchun ochib, keyin variant tanlanadi.
    await user.click(screen.getByRole('combobox', { name: /Beriladigan rol/i }));
    await user.click(await screen.findByRole('option', { name: /Sotuvchi/i }));

    const confirm = screen
      .getAllByRole('button', { name: /Tasdiqlash/i })
      .at(-1)!;
    await user.click(confirm);

    await waitFor(() =>
      expect(staffRegistrationApi.approve).toHaveBeenCalledWith(1, {
        roleCode: 'SELLER',
        position: undefined,
      })
    );
  });

  it('ADMIN tanlanganda ogohlantirish chiqadi', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Tasdiqlash/i }));

    // Ariza ADMIN so'ragan — oyna ochilishi bilan ogohlantirish ko'rinadi
    expect(await screen.findByText(/TO‘LIQ kirish beradi/i)).toBeInTheDocument();
  });
});

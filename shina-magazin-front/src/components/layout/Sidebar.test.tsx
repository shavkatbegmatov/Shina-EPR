import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../../i18n';
import { useAuthStore } from '../../store/authStore';
import { PermissionCode } from '../../hooks/usePermission';

vi.mock('../../api/staffRegistration.api', () => ({
  staffRegistrationApi: { pendingCount: vi.fn() },
}));

import { staffRegistrationApi } from '../../api/staffRegistration.api';
import { Sidebar } from './Sidebar';

/**
 * Menyudagi ko'rib chiqilmagan arizalar hisoblagichi.
 *
 * <p>Eng muhimi — {@code ruxsatsiz so'rov yubormaydi}: hisoblagich
 * endpointi EMPLOYEES_VIEW talab qiladi, ya'ni ruxsatsiz foydalanuvchida
 * har sahifa ochilishida 403 so'rovi ketardi.
 */
describe('Sidebar — arizalar hisoblagichi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderSidebar(permissions: string[]) {
    useAuthStore.setState({ permissions: new Set(permissions) });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
    render(<Sidebar />, { wrapper: Wrapper });
  }

  it('kutilayotgan arizalar soni ko\'rsatiladi', async () => {
    vi.mocked(staffRegistrationApi.pendingCount).mockResolvedValue(3);

    renderSidebar([PermissionCode.EMPLOYEES_VIEW]);

    expect(await screen.findByText('3')).toBeInTheDocument();
  });

  it('ariza bo\'lmasa hisoblagich chiqmaydi', async () => {
    vi.mocked(staffRegistrationApi.pendingCount).mockResolvedValue(0);

    renderSidebar([PermissionCode.EMPLOYEES_VIEW]);

    await waitFor(() => expect(staffRegistrationApi.pendingCount).toHaveBeenCalled());
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('ruxsat bo\'lmasa so\'rov umuman yuborilmaydi', async () => {
    vi.mocked(staffRegistrationApi.pendingCount).mockResolvedValue(5);

    // Faqat mahsulotlarni ko'ra oladigan xodim
    renderSidebar([PermissionCode.PRODUCTS_VIEW]);

    await waitFor(() => expect(screen.queryByText('5')).not.toBeInTheDocument());
    expect(staffRegistrationApi.pendingCount).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../../i18n';
import type { Employee, PagedResponse } from '../../types';

vi.mock('../../api/employees.api', () => ({
  employeesApi: {
    getAll: vi.fn(),
    getByStatus: vi.fn(),
    getAvailableUsers: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    changeRole: vi.fn(),
    export: { excel: vi.fn(), pdf: vi.fn(), exportData: vi.fn() },
  },
}));
vi.mock('../../api/roles.api', () => ({
  rolesApi: { getAll: vi.fn() },
}));

import { employeesApi } from '../../api/employees.api';
import { rolesApi } from '../../api/roles.api';
import { EmployeesPage } from './EmployeesPage';
import { useAuthStore } from '../../store/authStore';
import { PermissionCode } from '../../hooks/usePermission';

const EMPLOYEE: Employee = {
  id: 1,
  fullName: 'Anvar Qodirov',
  phone: '+998901234567',
  position: 'Kassir',
  status: 'ACTIVE',
  hireDate: '2026-01-10',
} as Employee;

function pageOf(content: Employee[]): PagedResponse<Employee> {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: 1,
    first: true,
    last: true,
  } as PagedResponse<Employee>;
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return render(<EmployeesPage />, { wrapper: Wrapper });
}

describe('EmployeesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    useAuthStore.setState({
      permissions: new Set([
        PermissionCode.EMPLOYEES_VIEW,
        PermissionCode.EMPLOYEES_CREATE,
        PermissionCode.EMPLOYEES_UPDATE,
      ]),
    });

    vi.mocked(employeesApi.getAll).mockResolvedValue(pageOf([EMPLOYEE]));
    vi.mocked(employeesApi.getByStatus).mockResolvedValue([]);
    vi.mocked(employeesApi.getAvailableUsers).mockResolvedValue([]);
    vi.mocked(rolesApi.getAll).mockResolvedValue([]);
  });

  it('xodimlar ro\'yxatini yuklaydi', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getAllByText('Anvar Qodirov').length).toBeGreaterThan(0)
    );
  });

  // Har bosilgan harf uchun sahifalangan so'rov yuborish serverni bekorga
  // yuklaydi va javoblar tartibsiz kelsa ro'yxat "sakraydi".
  it('qidiruvda har harf uchun alohida so\'rov yubormaydi', async () => {
    renderPage();
    await waitFor(() => expect(employeesApi.getAll).toHaveBeenCalledTimes(1));

    const input = screen.getByPlaceholderText(/qidirish/i);
    const term = 'anvar';
    for (let i = 1; i <= term.length; i++) {
      fireEvent.change(input, { target: { value: term.slice(0, i) } });
    }

    await waitFor(() =>
      expect(employeesApi.getAll).toHaveBeenCalledWith(expect.objectContaining({ search: 'anvar' }))
    );
    expect(vi.mocked(employeesApi.getAll).mock.calls.length).toBeLessThanOrEqual(2);
  });

  // Rollar va band bo'lmagan foydalanuvchilar faqat oynada kerak — ular
  // ATAYLAB `enabled` bilan to'silgan.
  it('rollar va foydalanuvchilar faqat oyna ochilganda so\'raladi', async () => {
    renderPage();
    await waitFor(() => expect(employeesApi.getAll).toHaveBeenCalled());

    expect(rolesApi.getAll).not.toHaveBeenCalled();
    expect(employeesApi.getAvailableUsers).not.toHaveBeenCalled();
  });
});

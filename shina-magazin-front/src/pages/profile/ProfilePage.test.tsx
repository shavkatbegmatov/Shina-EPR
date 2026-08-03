import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../../i18n';
import type { Role, User } from '../../types';

vi.mock('../../api/auth.api', () => ({
  authApi: { getCurrentUser: vi.fn(), changePassword: vi.fn() },
}));
vi.mock('../../api/roles.api', () => ({
  rolesApi: { getAll: vi.fn() },
}));

const navigateSpy = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateSpy };
});

import { authApi } from '../../api/auth.api';
import { rolesApi } from '../../api/roles.api';
import { ProfilePage } from './ProfilePage';
import { useAuthStore } from '../../store/authStore';
import { configureQueryDefaults } from '../../lib/queryConfig';

/**
 * Profil sahifasi — parol o'zgartirish yo'li.
 *
 * <p>Bu yerdagi xato ikki tomonlama qimmat: kuchsiz parol o'tib ketsa
 * hisob himoyasi pasayadi, mos kelmagan tasdiqlash o'tib ketsa esa
 * foydalanuvchi O'ZI bilmagan parol bilan qolib, tizimdan chiqib
 * ketadi.
 *
 * <p>Server tomonda parol o'zgarganda barcha sessiyalar bekor qilinadi,
 * shuning uchun sahifaning majburiy qayta kirishi shunchaki qulaylik
 * emas — u serverdagi haqiqatga mos keladi.
 */

const USER: User = {
  id: 1,
  username: 'kassir',
  fullName: 'Anvar Qodirov',
  email: 'anvar@example.com',
  phone: '+998901234567',
  role: 'SELLER',
  active: true,
} as unknown as User;

const ROLES: Role[] = [
  { id: 1, code: 'SELLER', name: 'Sotuvchi', isActive: true } as unknown as Role,
];

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  configureQueryDefaults(qc);
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  render(<ProfilePage />, { wrapper: Wrapper });
  return qc;
}

/** Xavfsizlik tabini ochib, parol maydonlarini to'ldiradi. */
async function fillPasswordForm(newPassword: string, confirmPassword = newPassword) {
  fireEvent.click(await screen.findByRole('button', { name: /Xavfsizlik/i }));

  fireEvent.change(await screen.findByPlaceholderText(/Joriy parolingizni/i), {
    target: { value: 'EskiParol1' },
  });
  fireEvent.change(screen.getByPlaceholderText(/Yangi xavfsiz parol/i), {
    target: { value: newPassword },
  });
  fireEvent.change(screen.getByPlaceholderText(/qayta kiriting/i), {
    target: { value: confirmPassword },
  });
}

function submitButton() {
  return screen.getByRole('button', { name: /^Parolni o'zgartirish$/i });
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateSpy.mockClear();
    Element.prototype.scrollIntoView = vi.fn();

    vi.mocked(authApi.getCurrentUser).mockResolvedValue(USER);
    vi.mocked(authApi.changePassword).mockResolvedValue(undefined);
    vi.mocked(rolesApi.getAll).mockResolvedValue(ROLES);
  });

  it('foydalanuvchi ma\'lumotini yuklaydi', async () => {
    renderPage();

    expect(await screen.findByText('Anvar Qodirov')).toBeInTheDocument();
    expect(authApi.getCurrentUser).toHaveBeenCalled();
  });

  /**
   * Kuchsiz parol bilan tugma BOSILMAYDI.
   *
   * <p>Talab: uzunlik, katta harf, kichik harf, raqam va maxsus belgi.
   * Faqat kichik harflardan iborat parol o'tmasligi kerak.
   */
  it('kuchsiz parol bilan yuborish tugmasi o\'chirilgan', async () => {
    renderPage();
    await fillPasswordForm('parool');

    expect(submitButton()).toBeDisabled();
  });

  it('kuchli parol bilan tugma faollashadi', async () => {
    renderPage();
    await fillPasswordForm('YangiParol1!');

    expect(submitButton()).toBeEnabled();
  });

  /**
   * Tasdiqlash mos kelmasa so'rov KETMASLIGI kerak.
   *
   * <p>Aks holda foydalanuvchi o'zi bilmagan parolga o'tib, barcha
   * qurilmalardan chiqarilgan holda qolardi — qayta kirish uchun esa
   * o'sha noma'lum parol kerak bo'lardi.
   *
   * <p>To'siq ikki qavatli: `react-hook-form` maydon qoidasi yuborishni
   * to'xtatadi, `onSubmitPassword` ichidagi tekshiruv esa zaxira. Bu
   * test BIRINCHI qavatni tekshiradi — amalda ishlaydigani o'sha, ikkinchisi
   * unga yetib bormaydi. Shuning uchun aynan maydon xatosi kutiladi.
   */
  it('tasdiqlash mos kelmasa parol yuborilmaydi', async () => {
    renderPage();
    await fillPasswordForm('YangiParol1!', 'BoshqaParol1!');

    fireEvent.click(submitButton());

    await waitFor(() =>
      expect(screen.getByText('Parollar mos kelmadi')).toBeInTheDocument()
    );
    expect(authApi.changePassword).not.toHaveBeenCalled();
  });

  it('so\'rov to\'g\'ri tarkib bilan yuboriladi', async () => {
    renderPage();
    await fillPasswordForm('YangiParol1!');

    fireEvent.click(submitButton());

    await waitFor(() => expect(authApi.changePassword).toHaveBeenCalled());
    expect(authApi.changePassword).toHaveBeenCalledWith({
      currentPassword: 'EskiParol1',
      newPassword: 'YangiParol1!',
      confirmPassword: 'YangiParol1!',
    });
  });

  /**
   * Parol o'zgargach tizimdan CHIQARILADI.
   *
   * <p>Server barcha sessiyalarni bekor qiladi (shu jumladan joriysini),
   * ya'ni bu yerda qolib ketish foydalanuvchini har so'rovda xato bilan
   * kutib olardi. Chiqarish — serverdagi holatga mos yagona yo'l.
   */
  it('parol o\'zgargach tizimdan chiqarib, kirish sahifasiga yuboradi', async () => {
    // Kirgan holatni o'rnatamiz — chiqarish uni tozalashi kerak.
    useAuthStore.setState({ accessToken: 'eski-token', isAuthenticated: true });
    localStorage.setItem('accessToken', 'eski-token');

    renderPage();
    await fillPasswordForm('YangiParol1!');

    fireEvent.click(submitButton());
    await waitFor(() => expect(authApi.changePassword).toHaveBeenCalled());

    // Chiqarish ATAYLAB kechiktirilgan: foydalanuvchi muvaffaqiyat
    // xabarini o'qib ulgursin.
    await waitFor(() => expect(navigateSpy).toHaveBeenCalledWith('/admin/login'), {
      timeout: 3000,
    });

    // Spy emas, KUZATILADIGAN natija: token ham store'dan, ham
    // brauzer xotirasidan o'chgan bo'lishi kerak.
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(localStorage.getItem('accessToken')).toBeNull();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '../../i18n';
import { usePortalAuthStore } from '../../portal/store/portalAuthStore';
import type { PublicSettings } from '../../types';

vi.mock('../../api/settings.api', () => ({
  settingsApi: { getPublic: vi.fn() },
}));

import { settingsApi } from '../../api/settings.api';
import { ShopLoginPage } from './ShopLoginPage';

/**
 * Telegram orqali ro'yxatdan o'tish taklifi.
 *
 * <p>Blok ommaviy sozlamalarga qarab ko'rsatiladi, ya'ni uni jimgina
 * yo'qotib qo'yish oson: backend maydonni qaytarmasa yoki bot nomi bo'sh
 * bo'lsa sahifa xatosiz, lekin ro'yxatdan o'tish yo'lisiz ochilardi.
 */
describe('ShopLoginPage — Telegram ro\'yxatdan o\'tish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePortalAuthStore.setState({ customer: null, isAuthenticated: false });
  });

  function renderPage(settings: PublicSettings) {
    vi.mocked(settingsApi.getPublic).mockResolvedValue(settings);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><ShopLoginPage /></MemoryRouter>
      </QueryClientProvider>
    );
  }

  it('yoqilgan bo\'lsa bot havolasi ko\'rsatiladi', async () => {
    renderPage({ telegramRegistrationEnabled: true, telegramBotUsername: 'protektor_bot' });

    const link = await screen.findByRole('link', { name: /Telegramda ochish/i });
    expect(link).toHaveAttribute('href', 'https://t.me/protektor_bot?start=register');
    // Yangi oynada ochilsin — mijoz login sahifasini yo'qotmasin
    expect(link).toHaveAttribute('target', '_blank');
    expect(screen.getByText(/Telegram orqali ro'yxatdan o'ting/i)).toBeInTheDocument();
  });

  it('sozlama o\'chiq bo\'lsa blok umuman chiqmaydi', async () => {
    renderPage({ telegramRegistrationEnabled: false, telegramBotUsername: 'protektor_bot' });

    await waitFor(() => expect(settingsApi.getPublic).toHaveBeenCalled());
    expect(screen.queryByRole('link', { name: /Telegramda ochish/i })).not.toBeInTheDocument();
  });

  // Bot nomisiz havola `t.me/` bo'lib, mijozni hech qayerga olib bormasdi.
  it('bot username bo\'sh bo\'lsa havola ko\'rsatilmaydi', async () => {
    renderPage({ telegramRegistrationEnabled: true, telegramBotUsername: '' });

    await waitFor(() => expect(settingsApi.getPublic).toHaveBeenCalled());
    expect(screen.queryByRole('link', { name: /Telegramda ochish/i })).not.toBeInTheDocument();
  });

  // Eski backend bu maydonlarni umuman qaytarmaydi — sahifa baribir ishlashi kerak.
  it('maydonlarsiz javobda ham telefon+PIN formasi ishlaydi', async () => {
    renderPage({ imageFallback: 'SVG' });

    await waitFor(() => expect(settingsApi.getPublic).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /Kirish/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Telegramda ochish/i })).not.toBeInTheDocument();
  });
});

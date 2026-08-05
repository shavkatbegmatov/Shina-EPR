import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../../i18n';
import type { AppSettings } from '../../types';

vi.mock('../../api/settings.api', () => ({
  settingsApi: {
    get: vi.fn(),
    update: vi.fn(),
    getDemoStatus: vi.fn(),
    generateDemoData: vi.fn(),
    removeDemoData: vi.fn(),
    testTelegram: vi.fn(),
    export: { excel: vi.fn(), pdf: vi.fn(), exportData: vi.fn() },
  },
}));

vi.mock('../../api/products.api', () => ({
  brandsApi: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  categoriesApi: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

// Vitrinaning rasm komponenti o'z so'rovini yuboradi — bu testga aloqasi yo'q.
vi.mock('../../shop/components/ProductImage', () => ({
  ProductImage: () => null,
}));

import { settingsApi } from '../../api/settings.api';
import { brandsApi, categoriesApi } from '../../api/products.api';
import { SettingsPage } from './SettingsPage';
import { configureQueryDefaults } from '../../lib/queryConfig';
import { useAuthStore } from '../../store/authStore';

const SETTINGS: AppSettings = {
  debtDueDays: 30,
  imageFallback: 'SVG',
  receiptShopName: 'Protektor',
  receiptShopPhone: '',
  receiptShopAddress: '',
  receiptFooter: '',
  telegramEnabled: false,
  telegramChatId: '',
  telegramConfigured: false,
  telegramEvents: '',
} as AppSettings;

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // Ishlab chiqarishdagi muddatlar bilan bir xil — aynan shu narsa testni
  // mazmunli qiladi (sozlamalar keshda uzoq turadi).
  configureQueryDefaults(qc);

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return render(<SettingsPage />, { wrapper: Wrapper });
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsApi.get).mockResolvedValue(SETTINGS);
    vi.mocked(settingsApi.update).mockResolvedValue({ ...SETTINGS, debtDueDays: 45 });
    vi.mocked(settingsApi.getDemoStatus).mockResolvedValue({
      active: false,
      datasetVersion: '2.0',
      totalRecords: 0,
      counts: {},
    });
    vi.mocked(settingsApi.generateDemoData).mockResolvedValue({
      active: true,
      datasetVersion: '2.0',
      generatedAt: '2026-08-05T12:00:00',
      totalRecords: 42,
      counts: { products: 12, customers: 8, sales: 12, purchases: 4 },
    });
    useAuthStore.setState({ permissions: new Set(['SETTINGS_UPDATE']) });
    vi.mocked(brandsApi.getAll).mockResolvedValue([]);
    vi.mocked(categoriesApi.getAll).mockResolvedValue([]);
  });

  it('saqlagandan keyin sozlamalar so\'rovini bekor qiladi', async () => {
    renderPage();

    await waitFor(() => expect(settingsApi.get).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: /saqlash/i }));

    await waitFor(() => expect(settingsApi.update).toHaveBeenCalledTimes(1));

    // Sozlamalar "ma'lumotnoma" keshida 10 daqiqa yangi hisoblanadi va ularni
    // SMENALAR sahifasi ham o'qiydi. Invalidatsiyasiz saqlangan qiymat boshqa
    // sahifada eski holida ko'rinardi — shuning uchun qayta so'rov SHART.
    await waitFor(() => expect(settingsApi.get).toHaveBeenCalledTimes(2));
  });

  it('demo ma\'lumotlarni bir tugma bilan yaratadi va holatni yangilaydi', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Demo' }));

    await screen.findByText("Demo ma'lumotlar hali yaratilmagan");
    fireEvent.click(screen.getByRole('button', { name: /demoni yaratish/i }));

    await waitFor(() => expect(settingsApi.generateDemoData).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Demo foydalanishga tayyor')).toBeInTheDocument();
    expect(screen.getAllByText('12')).toHaveLength(2);
  });

  it('demo o\'chirishni tasdiqlaydi va cleanup endpointini chaqiradi', async () => {
    vi.mocked(settingsApi.getDemoStatus).mockResolvedValue({
      active: true,
      datasetVersion: '2.0',
      generatedAt: '2026-08-05T12:00:00',
      totalRecords: 54,
      counts: { products: 12, customers: 8, sales: 12, purchases: 4 },
    });
    vi.mocked(settingsApi.removeDemoData).mockResolvedValue({
      active: false,
      datasetVersion: '2.0',
      totalRecords: 0,
      counts: {},
    });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Demo' }));
    fireEvent.click(await screen.findByRole('button', { name: /demoni o'chirish/i }));
    fireEvent.click(screen.getByRole('button', { name: /ha, demoni o'chirish/i }));

    await waitFor(() => expect(settingsApi.removeDemoData).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Demo ma'lumotlar hali yaratilmagan")).toBeInTheDocument();
  });
});

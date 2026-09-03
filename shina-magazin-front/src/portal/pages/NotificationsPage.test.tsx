import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PagedResponse, PortalNotification } from '../types/portal.types';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../api/portal.api', () => ({
  portalApiClient: {
    getNotifications: vi.fn(),
    markNotificationAsRead: vi.fn(),
    markAllNotificationsAsRead: vi.fn(),
  },
}));

import { portalApiClient } from '../api/portal.api';
import PortalNotificationsPage from './NotificationsPage';

const notification = (id: number, isRead: boolean): PortalNotification =>
  ({
    id,
    title: `Xabar ${id}`,
    message: 'Matn',
    notificationType: 'SYSTEM',
    isRead,
    createdAt: new Date().toISOString(),
  }) as unknown as PortalNotification;

const singlePage = (content: PortalNotification[]): PagedResponse<PortalNotification> => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: 1,
  last: true,
  first: true,
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/hisob/bildirishnomalar']}>
        <PortalNotificationsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
  return client;
}

describe('PortalNotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("o'qilmaganlar bo'lsa 'hammasini o'qilgan' tugmasi chiqadi va API chaqiriladi", async () => {
    vi.mocked(portalApiClient.getNotifications).mockResolvedValue(
      singlePage([notification(1, false), notification(2, true)])
    );
    vi.mocked(portalApiClient.markAllNotificationsAsRead).mockResolvedValue(1);

    renderPage();

    expect(await screen.findByText('Xabar 1')).toBeInTheDocument();
    const markAll = screen.getByRole('button', { name: /\(1\)/ });
    await userEvent.click(markAll);

    await waitFor(() => expect(portalApiClient.markAllNotificationsAsRead).toHaveBeenCalledTimes(1));
    // Keshda hammasi o'qilgan — tugma yo'qoladi (qayta so'rovsiz)
    await waitFor(() => expect(screen.queryByRole('button', { name: /\(1\)/ })).not.toBeInTheDocument());
    expect(portalApiClient.getNotifications).toHaveBeenCalledTimes(1);
  });

  it("bitta bildirishnomani bosish uni o'qilgan qiladi", async () => {
    vi.mocked(portalApiClient.getNotifications).mockResolvedValue(singlePage([notification(5, false)]));
    vi.mocked(portalApiClient.markNotificationAsRead).mockResolvedValue(undefined);

    renderPage();

    const card = await screen.findByRole('button', { name: /Xabar 5/ });
    await userEvent.click(card);

    await waitFor(() => expect(portalApiClient.markNotificationAsRead).toHaveBeenCalledWith(5));
    await waitFor(() => expect(screen.queryByRole('button', { name: /Xabar 5/ })).not.toBeInTheDocument());
  });
});

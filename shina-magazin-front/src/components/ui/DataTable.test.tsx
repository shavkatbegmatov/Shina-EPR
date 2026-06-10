import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, type Column } from './DataTable';

interface Row {
  id: number;
  name: string;
}

const columns: Column<Row>[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Nomi' },
];

const keyExtractor = (item: Row) => item.id;

const rows: Row[] = [
  { id: 1, name: 'Michelin' },
  { id: 2, name: 'Bridgestone' },
];

describe('DataTable', () => {
  it('loading=true holatda skeleton placeholderlar ko\'rsatadi, data qatorlarini emas', () => {
    const { container } = render(
      <DataTable
        data={rows}
        columns={columns}
        keyExtractor={keyExtractor}
        loading
        skeletonRows={3}
      />
    );

    // Skeleton placeholderlar mavjud
    expect(container.querySelector('.skeleton')).not.toBeNull();
    // Data qatorlari (cell qiymatlari) ko'rinmaydi
    expect(screen.queryByText('Michelin')).not.toBeInTheDocument();
    expect(screen.queryByText('Bridgestone')).not.toBeInTheDocument();
  });

  it('error berilganda xato matnini va onRetry tugmasini ko\'rsatadi', () => {
    const onRetry = vi.fn();
    render(
      <DataTable
        data={[]}
        columns={columns}
        keyExtractor={keyExtractor}
        error="Tarmoq xatosi"
        onRetry={onRetry}
      />
    );

    expect(screen.getByText('Tarmoq xatosi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /qayta urinish/i })).toBeInTheDocument();
  });

  it('retry tugmasi bosilganda onRetry chaqiriladi', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <DataTable
        data={[]}
        columns={columns}
        keyExtractor={keyExtractor}
        error="Tarmoq xatosi"
        onRetry={onRetry}
      />
    );

    await user.click(screen.getByRole('button', { name: /qayta urinish/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('error bo\'lsa-yu onRetry berilmasa, tugma ko\'rsatilmaydi', () => {
    render(
      <DataTable
        data={[]}
        columns={columns}
        keyExtractor={keyExtractor}
        error="Tarmoq xatosi"
      />
    );

    expect(screen.getByText('Tarmoq xatosi')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /qayta urinish/i })).not.toBeInTheDocument();
  });

  it('bo\'sh data uchun emptyTitle ni ko\'rsatadi', () => {
    render(
      <DataTable
        data={[]}
        columns={columns}
        keyExtractor={keyExtractor}
        emptyTitle="Hech narsa yo'q"
      />
    );

    expect(screen.getByText("Hech narsa yo'q")).toBeInTheDocument();
  });

  it('data qatorlari cell qiymatlarini render qiladi', () => {
    render(
      <DataTable data={rows} columns={columns} keyExtractor={keyExtractor} />
    );

    expect(screen.getByText('Michelin')).toBeInTheDocument();
    expect(screen.getByText('Bridgestone')).toBeInTheDocument();
    // header ham mavjud
    expect(screen.getByText('Nomi')).toBeInTheDocument();
  });
});

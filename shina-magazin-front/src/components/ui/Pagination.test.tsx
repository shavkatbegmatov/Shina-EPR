import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import i18n from '../../i18n';
import { Pagination } from './Pagination';

/**
 * Sahifalash — HAR BIR ro'yxat sahifasida ishlatiladi.
 *
 * <p>Uning tugmalarida faqat ikonka bor, ya'ni ularning yagona nomi —
 * `title` atributi. U tarjimadan tashqarida qolsa, rus tilidagi
 * foydalanuvchi butun ERP bo'ylab o'zbekcha maslahat matnini ko'rardi va
 * ekran o'quvchi ham shuni o'qirdi.
 */

function renderPagination(overrides: Partial<Parameters<typeof Pagination>[0]> = {}) {
  const onPageChange = vi.fn();
  render(
    <Pagination
      currentPage={2}
      totalPages={5}
      totalElements={100}
      pageSize={20}
      onPageChange={onPageChange}
      {...overrides}
    />
  );
  return onPageChange;
}

describe('Pagination', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('uz');
  });

  it('o\'zbek tilida maslahat matnlari o\'zbekcha', async () => {
    renderPagination();

    expect(screen.getByTitle('Birinchi sahifa')).toBeInTheDocument();
    expect(screen.getByTitle('Oxirgi sahifa')).toBeInTheDocument();
  });

  it('rus tilida maslahat matnlari ruscha', async () => {
    await i18n.changeLanguage('ru');
    renderPagination();

    expect(screen.getByTitle('Первая страница')).toBeInTheDocument();
    expect(screen.getByTitle('Последняя страница')).toBeInTheDocument();
    expect(screen.queryByTitle('Birinchi sahifa')).not.toBeInTheDocument();
  });

  // Sahifa almashishi ishlashi ham qulflanadi — tarjima uni buzmasligi kerak.
  it('keyingi sahifa tugmasi sahifani oshiradi', () => {
    const onPageChange = renderPagination();

    fireEvent.click(screen.getByTitle('Keyingi sahifa'));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});

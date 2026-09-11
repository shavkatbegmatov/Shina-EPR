import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CurrencyInput } from './CurrencyInput';
import { THOUSANDS_SEPARATOR, formatCurrency } from '../../config/constants';

/**
 * Kiritish maydonidagi raqam sahifadagi summalar bilan BIR XIL ajratkichda
 * ko'rinishi kerak — ilgari maydon ru-RU ("150 000"), summalar uz-UZ
 * ("150,000") bilan chiqib, bitta oynada ikki xil yozuv turardi.
 */
describe('CurrencyInput', () => {
  const nb = THOUSANDS_SEPARATOR;

  it('qiymatni formatCurrency bilan bir xil ajratkichda ko\'rsatadi', () => {
    render(<CurrencyInput label="Qabul narxi" value={150_000} onChange={() => {}} />);
    const input = screen.getByRole('textbox', { name: 'Qabul narxi' }) as HTMLInputElement;
    expect(input.value).toBe(`150${nb}000`);
    expect(formatCurrency(150_000)).toBe(`${input.value} so'm`);
  });

  it('terilgan raqamni guruhlab ko\'rsatadi va sonni qaytaradi', () => {
    const onChange = vi.fn();
    render(<CurrencyInput label="Summa" value={0} onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Summa' }) as HTMLInputElement;
    expect(input.value).toBe('');
    fireEvent.change(input, { target: { value: '2760000' } });
    expect(onChange).toHaveBeenLastCalledWith(2_760_000);
    expect(input.value).toBe(`2${nb}760${nb}000`);
  });

  it('formatlangan matn qo\'yilganda (paste) ajratkichlar tashlab yuboriladi', () => {
    const onChange = vi.fn();
    render(<CurrencyInput label="Summa" value={0} onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Summa' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '1,234,567' } });
    expect(onChange).toHaveBeenLastCalledWith(1_234_567);
    fireEvent.change(input, { target: { value: `1${nb}234` } });
    expect(onChange).toHaveBeenLastCalledWith(1_234);
  });
});

import { describe, it, expect } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import '../i18n';
import { getApiErrorMessage } from './apiError';

/**
 * Sahifalarda `catch (error) { console.error(...) }` naqshi keng tarqalgan edi —
 * foydalanuvchi hech narsa ko'rmasdi. Mutatsiyalarda bu ayniqsa xavfli: xodim
 * "Saqlash" bosadi, hech nima o'zgarmaydi va u saqlandi deb o'ylaydi.
 *
 * Bu yordamchi backend xabarini ajratadi. Testlar backendning HAQIQIY javob
 * shakllariga bog'langan (`ApiResponse.error(message)` va
 * `GlobalExceptionHandler.handleValidationExceptions` dagi maydon xaritasi).
 */
function axiosErrorWith(status: number, data: unknown): AxiosError {
  const error = new AxiosError('Request failed');
  error.response = {
    status,
    statusText: '',
    data,
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  };
  return error;
}

describe('getApiErrorMessage', () => {
  it('backend xabarini ishlatadi (ApiResponse.error)', () => {
    const error = axiosErrorWith(409, {
      success: false,
      message: "Bunday yozuv allaqachon mavjud",
    });

    expect(getApiErrorMessage(error)).toBe('Bunday yozuv allaqachon mavjud');
  });

  it('validatsiya xatolarini maydonlar bo\'yicha yig\'adi', () => {
    // GlobalExceptionHandler.handleValidationExceptions shakli
    const error = axiosErrorWith(400, {
      success: false,
      message: 'Validatsiya xatosi',
      data: { quantity: 'Miqdor manfiy bo\'lishi mumkin emas', sku: 'SKU band' },
    });

    const message = getApiErrorMessage(error);
    expect(message).toContain("Miqdor manfiy bo'lishi mumkin emas");
    expect(message).toContain('SKU band');
  });

  it('tarmoq uzilishida (response yo\'q) aniq xabar beradi', () => {
    const error = new AxiosError('Network Error');
    // response o'rnatilmagan — server javob bermadi

    expect(getApiErrorMessage(error)).toContain('aloqa');
  });

  it('xabar bo\'sh bo\'lsa fallback ishlatiladi', () => {
    const error = axiosErrorWith(500, { success: false, message: '   ' });

    expect(getApiErrorMessage(error, 'Zaxira xabar')).toBe('Zaxira xabar');
  });

  it('axios bo\'lmagan xatoning matnini beradi', () => {
    expect(getApiErrorMessage(new Error('Kutilmagan holat'))).toBe('Kutilmagan holat');
  });

  it('noma\'lum qiymat uchun ham satr qaytaradi (hech qachon bo\'sh emas)', () => {
    expect(getApiErrorMessage(null)).toBeTruthy();
    expect(getApiErrorMessage(undefined)).toBeTruthy();
    expect(getApiErrorMessage({ nimadir: 'boshqa' })).toBeTruthy();
  });
});

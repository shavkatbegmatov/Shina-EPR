import { AxiosError } from 'axios';
import i18n from '../i18n';

/**
 * API xatosidan foydalanuvchiga ko'rsatiladigan xabar ajratib oladi.
 *
 * <p>Muammo: sahifalarda `catch (error) { console.error(...) }` naqshi keng
 * tarqalgan edi — foydalanuvchi hech narsa ko'rmasdi. Mutatsiyalarda bu ayniqsa
 * xavfli: xodim "Saqlash" bosadi, hech nima o'zgarmaydi va u saqlandi deb
 * o'ylaydi. Bu yordamchi backend xabarini bir joyda ajratadi, shunda har bir
 * chaqiruv joyi faqat `toast.error(getApiErrorMessage(e))` yozadi.
 *
 * <p>Backend `ApiResponse.error(message)` shaklida javob beradi, validatsiya
 * xatolarida esa `data` ichida `{maydon: xabar}` xaritasi keladi
 * (`GlobalExceptionHandler.handleValidationExceptions`) — ikkalasi ham
 * hisobga olinadi.
 *
 * <p>401 va 403 axios interceptor'ida allaqachon toast qiladi; bu yerda ular
 * qayta ishlanmaydi (ikki marta ko'rsatilmasin).
 */
export function getApiErrorMessage(error: unknown, fallback?: string): string {
  const defaultMessage = fallback ?? i18n.t('common.error');

  if (!(error instanceof AxiosError)) {
    return error instanceof Error && error.message ? error.message : defaultMessage;
  }

  // Tarmoq uzilishi / server javob bermadi — `response` umuman bo'lmaydi
  if (!error.response) {
    return i18n.t('common.networkError');
  }

  const body = error.response.data as
    | { message?: string; data?: unknown }
    | undefined;

  // Validatsiya xatolari: data = { maydon: "xabar", ... }
  const fieldErrors = extractFieldErrors(body?.data);
  if (fieldErrors) return fieldErrors;

  return body?.message?.trim() || defaultMessage;
}

/** `{maydon: xabar}` xaritasini bitta satrga yig'adi (bo'lmasa null). */
function extractFieldErrors(data: unknown): string | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;

  const messages = Object.values(data as Record<string, unknown>)
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

  return messages.length ? messages.join(', ') : null;
}

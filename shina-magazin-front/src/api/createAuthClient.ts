import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../config/constants';

export type SessionLostReason = 'refresh-failed' | 'no-refresh-token';

export interface AuthClientOptions {
  /** localStorage'dagi access token kaliti */
  accessTokenKey: string;
  /** localStorage'dagi refresh token kaliti */
  refreshTokenKey: string;
  /** Refresh endpointi, masalan '/v1/auth/refresh-token' */
  refreshPath: string;
  /** Refresh muvaffaqiyatsiz yoki refresh token yo'q — sessiyani tozalash/yo'naltirish */
  onSessionLost: (reason: SessionLostReason, error: unknown) => void;
  /** 403 uchun ixtiyoriy xabar (ERP toast) */
  onForbidden?: (message: string, url?: string) => void;
}

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

interface ApiErrorBody {
  message?: string;
}

/**
 * Bir vaqtda ketgan bir nechta 401 uchun YAGONA refresh (single-flight).
 *
 * Server refresh tokenni har chaqiruvda ROTATSIYA qiladi va rotatsiyadan
 * chiqqan eskisi qayta kelsa butun sessiyani o'ldiradi — bu o'g'irlangan
 * token himoyasi. Dedup bo'lmasa sahifadagi 2-3 parallel so'rov (dashboard
 * statistikasi + grafik + sidebar hisoblagichi) aynan shu himoyani o'ziga
 * qarshi ishlatardi: birinchi refresh tokenni aylantirar, ikkinchisi eski
 * token bilan kelib sessiyani yopardi va foydalanuvchi HAR token muddati
 * tugashida tizimdan chiqib qolardi.
 *
 * Promise'lar refreshPath + refreshTokenKey bo'yicha MODUL darajasida
 * saqlanadi: bitta sessiya uchun yaratilgan ikki klient (mijoz kabineti va
 * do'kon akkaunti — bir xil tokenlar) ham bitta refresh'ni bo'lishadi.
 *
 * Eslatma: tokenlar localStorage'da, ya'ni bu qulf bitta tab doirasida.
 * Ko'p tabli poyga tor oyna sifatida qoladi (AUDIT.md Q1).
 */
const inflightRefreshes = new Map<string, Promise<string>>();

export function refreshAccessToken(
  opts: Pick<AuthClientOptions, 'accessTokenKey' | 'refreshTokenKey' | 'refreshPath'>,
  refreshToken: string
): Promise<string> {
  const key = `${opts.refreshPath}|${opts.refreshTokenKey}`;
  let pending = inflightRefreshes.get(key);
  if (!pending) {
    pending = axios
      // Token JSON body'da — URL parametri proksi/server loglariga tushardi
      .post(`${API_BASE_URL}${opts.refreshPath}`, { refreshToken })
      .then((response) => {
        const { accessToken, refreshToken: nextRefreshToken } = response.data.data;
        localStorage.setItem(opts.accessTokenKey, accessToken);
        localStorage.setItem(opts.refreshTokenKey, nextRefreshToken);
        return accessToken as string;
      })
      .finally(() => {
        inflightRefreshes.delete(key);
      });
    inflightRefreshes.set(key, pending);
  }
  return pending;
}

/**
 * Bearer token qo'shadigan va 401 da single-flight refresh qiladigan axios klienti.
 *
 * Ilgari uchta klient (ERP, mijoz kabineti, do'kon akkaunti) bir xil mantiqni
 * nusxalab yurar edi, lekin faqat ERP'nikida dedup bor edi — mijozlar uchun
 * "parallel 401 sessiyani yopadi" xatosi tirik qolgan edi.
 */
export function createAuthClient(opts: AuthClientOptions): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem(opts.accessTokenKey);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiErrorBody>) => {
      const originalRequest = error.config as RetryableConfig | undefined;
      const status = error.response?.status;

      if (status === 401 && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;

        const refreshToken = localStorage.getItem(opts.refreshTokenKey);
        const isRefreshCall = String(originalRequest.url ?? '').includes(opts.refreshPath);

        if (refreshToken && !isRefreshCall) {
          try {
            // Parallel 401'lar bitta refresh natijasini kutadi
            const accessToken = await refreshAccessToken(opts, refreshToken);
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return client(originalRequest);
          } catch (refreshError) {
            opts.onSessionLost('refresh-failed', refreshError);
            return Promise.reject(refreshError);
          }
        }

        opts.onSessionLost('no-refresh-token', error);
        return Promise.reject(error);
      }

      if (status === 403 && opts.onForbidden) {
        opts.onForbidden(
          error.response?.data?.message || "Sizda bu amalni bajarish uchun ruxsat yo'q",
          error.config?.url
        );
      }

      return Promise.reject(error);
    }
  );

  return client;
}

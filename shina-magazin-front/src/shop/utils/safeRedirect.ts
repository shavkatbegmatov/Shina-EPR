/**
 * `?redirect=` parametrini xavfsiz yo'lga keltiradi.
 *
 * Faqat ilova ICHIDAGI mutlaq yo'l qabul qilinadi: `/` bilan boshlanishi va
 * `//` (protokol-nisbiy URL) yoki sxema bilan boshlanmasligi kerak. Aks holda
 * `/kirish?redirect=//evil.example` havolasi mijozni logindan keyin begona
 * saytga olib ketardi (ochiq redirect).
 */
export function safeRedirect(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (/[\r\n]/.test(value)) return fallback;
  return value;
}

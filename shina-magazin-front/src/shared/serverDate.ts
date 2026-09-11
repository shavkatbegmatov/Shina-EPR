/**
 * Server vaqtini o'qish — Toshkent devor vaqti, brauzer zonasidan qat'i nazar.
 *
 * <p>Backend `LocalDateTime` ni zona belgisisiz yuboradi ("2026-09-11T19:06:41"),
 * JVM esa Asia/Tashkent'da ishlaydi — ya'ni bu qator Toshkent devor vaqti.
 * `new Date("2026-09-11T19:06:41")` esa uni BRAUZER zonasida o'qiydi: Toshkentdagi
 * brauzerda to'g'ri, boshqa zonada (chet eldagi hamkor, UTC'dagi server, sinov
 * konteyneri) soatlar suriladi — masalan UTC brauzerda TEKSHIRILDI muhri 5 soat
 * kech chiqardi. Shuning uchun zona belgisisiz qator shu yerda Toshkent vaqti
 * sifatida haqiqiy instantga aylantiriladi; `Z` yoki `±hh:mm` bo'lsa brauzerning
 * o'zi to'g'ri o'qiydi.
 *
 * <p>Ko'rsatish ham hamma joyda Toshkent vaqtida (do'kon vaqti): `formatDate` /
 * `formatDateTime` `timeZone` bilan, date-fns `format` uchun esa
 * {@link toServerWallClock} — mahalliy getterlari Toshkent devor vaqtini beradigan
 * Date (date-fns-tz'ning `toZonedTime` usuli, qo'shimcha kutubxonasiz).
 */
export const SERVER_TIMEZONE = 'Asia/Tashkent';

/** `2026-09-11`, `2026-09-11T19:06`, `2026-09-11T19:06:41.202714` — zona belgisisiz ISO. */
const NAIVE_ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?)?$/;

const wallClockParts = new Intl.DateTimeFormat('en-US', {
  timeZone: SERVER_TIMEZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** Berilgan instant uchun zona siljishi (ms): Toshkent devor vaqti − UTC. */
const zoneOffsetMs = (instantMs: number): number => {
  const p: Record<string, number> = {};
  for (const { type, value } of wallClockParts.formatToParts(new Date(instantMs))) {
    if (type !== 'literal') p[type] = Number(value);
  }
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wall - Math.floor(instantMs / 1000) * 1000;
};

/**
 * Server qatorini haqiqiy instantga aylantiradi. Zona belgisisiz qator Toshkent
 * devor vaqti deb olinadi; `Z`/`±hh:mm` bo'lsa yoki format boshqa bo'lsa —
 * brauzerning o'z parseri (avvalgi xatti-harakat).
 */
export const parseServerDate = (value: string | number | Date): Date => {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  const m = NAIVE_ISO.exec(value.trim());
  if (!m) return new Date(value);
  const [, y, mo, d, h = '0', mi = '0', s = '0', frac = ''] = m;
  const ms = Number((frac + '000').slice(0, 3));
  const wall = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s, ms);
  // Devor vaqti → instant: siljish aynan o'sha instantga qarab (DST bo'lgan
  // zonalar uchun ikkinchi marta aniqlashtiriladi; Toshkentda DST yo'q).
  const approx = wall - zoneOffsetMs(wall);
  return new Date(wall - zoneOffsetMs(approx));
};

/**
 * Mahalliy getterlari (`getHours()` va h.k.) Toshkent devor vaqtini beradigan Date —
 * `date-fns`ning `format` i brauzer zonasida yozadi, unga aynan shu kerak.
 * Faqat ko'rsatish uchun; instant sifatida ishlatilmaydi.
 */
export const toServerWallClock = (value: string | number | Date): Date => {
  const instant = parseServerDate(value);
  const t = instant.getTime();
  if (Number.isNaN(t)) return instant;
  const wall = t + zoneOffsetMs(t);
  return new Date(wall + instant.getTimezoneOffset() * 60_000);
};

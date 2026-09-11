/**
 * Server vaqtini o'qish — Toshkent devor vaqti, brauzer zonasidan qat'i nazar.
 *
 * <p>Backend `LocalDateTime` ni Toshkent offset'i bilan yuboradi
 * ("2026-09-11T19:06:41.202714+05:00"). Eski javoblar, keshda qolgan ma'lumot va
 * ba'zi manbalar zona belgisisiz bo'lishi mumkin ("2026-09-11T19:06:41") — JVM
 * Asia/Tashkent'da ishlagani uchun bu ham Toshkent devor vaqti. `new Date(...)`
 * bunday qatorni BRAUZER zonasida o'qiydi: Toshkentdagi brauzerda to'g'ri, boshqa
 * zonada (chet eldagi hamkor, UTC'dagi sinov konteyneri) soatlar suriladi — masalan
 * UTC brauzerda TEKSHIRILDI muhri 5 soat kech chiqardi. Shuning uchun ISO qator shu
 * yerda O'ZIMIZ o'qiladi: offset bo'lsa u bilan, bo'lmasa Toshkent vaqti sifatida.
 * Brauzer parseriga tayanilmaydi — 6 xonali mikrosekund kasri va `+0500` kabi
 * shakllar har bir brauzerda har xil qabul qilinadi.
 *
 * <p>Ko'rsatish ham hamma joyda Toshkent vaqtida (do'kon vaqti): `formatDate` /
 * `formatDateTime` `timeZone` bilan, date-fns `format` uchun esa
 * {@link toServerWallClock} — mahalliy getterlari Toshkent devor vaqtini beradigan
 * Date (date-fns-tz'ning `toZonedTime` usuli, qo'shimcha kutubxonasiz).
 */
export const SERVER_TIMEZONE = 'Asia/Tashkent';

/**
 * `2026-09-11`, `2026-09-11T19:06`, `2026-09-11T19:06:41.202714`,
 * `2026-09-11T19:06:41.202714+05:00`, `…Z`, `…+0500` — ISO-8601, offset ixtiyoriy.
 */
const ISO_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?)?(Z|[+-]\d{2}:?\d{2})?$/i;

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
 * Server qatorini haqiqiy instantga aylantiradi. Offset (`+05:00`, `Z`, `+0500`)
 * bo'lsa u bilan; zona belgisisiz qator Toshkent devor vaqti deb olinadi; format
 * umuman boshqa bo'lsa — brauzerning o'z parseri (avvalgi xatti-harakat).
 */
export const parseServerDate = (value: string | number | Date): Date => {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  const m = ISO_DATE_TIME.exec(value.trim());
  if (!m) return new Date(value);
  const [, y, mo, d, h = '0', mi = '0', s = '0', frac = '', tz = ''] = m;
  const ms = Number((frac + '000').slice(0, 3));
  const wall = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s, ms);
  if (tz) {
    if (tz.toUpperCase() === 'Z') return new Date(wall);
    const sign = tz.startsWith('-') ? -1 : 1;
    const offsetMinutes = Number(tz.slice(1, 3)) * 60 + Number(tz.slice(-2));
    return new Date(wall - sign * offsetMinutes * 60_000);
  }
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

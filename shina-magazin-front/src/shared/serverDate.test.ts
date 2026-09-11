import { describe, expect, it } from 'vitest';
import { parseServerDate, toServerWallClock } from './serverDate';
import { formatDate, formatDateTime } from '../config/constants';

/**
 * Server "2026-09-11T19:06:41" ni Toshkent devor vaqti sifatida yuboradi.
 * Bu testlar jarayon zonasidan (TZ) qat'i nazar bir xil o'tishi kerak —
 * CI'da UTC, ishlab chiquvchida Asia/Tashkent, chet eldagi hamkorda boshqa.
 */
describe('parseServerDate', () => {
  it('zona belgisisiz qator Toshkent (+05:00) devor vaqti sifatida o\'qiladi', () => {
    expect(parseServerDate('2026-09-11T19:06:41').toISOString()).toBe('2026-09-11T14:06:41.000Z');
    expect(parseServerDate('2026-09-11T19:06:41.202714').toISOString()).toBe('2026-09-11T14:06:41.202Z');
    expect(parseServerDate('2026-09-11T00:30').toISOString()).toBe('2026-09-10T19:30:00.000Z');
    expect(parseServerDate('2026-09-11 19:06:41').toISOString()).toBe('2026-09-11T14:06:41.000Z');
  });

  it('faqat sana — Toshkent yarim tuni', () => {
    expect(parseServerDate('2026-09-11').toISOString()).toBe('2026-09-10T19:00:00.000Z');
  });

  it('zona belgisi bor qator o\'zgarmaydi', () => {
    expect(parseServerDate('2026-09-11T14:06:41Z').toISOString()).toBe('2026-09-11T14:06:41.000Z');
    expect(parseServerDate('2026-09-11T19:06:41+05:00').toISOString()).toBe('2026-09-11T14:06:41.000Z');
    expect(parseServerDate('2026-09-11T10:06:41-04:00').toISOString()).toBe('2026-09-11T14:06:41.000Z');
  });

  it('Date va epoch ms o\'zgarishsiz, noto\'g\'ri qator Invalid Date', () => {
    const d = new Date(1_000_000);
    expect(parseServerDate(d)).toBe(d);
    expect(parseServerDate(1_000_000).getTime()).toBe(1_000_000);
    expect(Number.isNaN(parseServerDate('bugun').getTime())).toBe(true);
  });
});

describe('toServerWallClock', () => {
  it('mahalliy getterlar Toshkent devor vaqtini beradi (date-fns format uchun)', () => {
    const wall = toServerWallClock('2026-09-11T19:06:41');
    expect(wall.getFullYear()).toBe(2026);
    expect(wall.getMonth()).toBe(8);
    expect(wall.getDate()).toBe(11);
    expect(wall.getHours()).toBe(19);
    expect(wall.getMinutes()).toBe(6);
    // Faqat sana: kun surilmaydi (manfiy zonalarda `new Date('2026-09-11')` bir kun orqaga ketardi)
    const day = toServerWallClock('2026-09-11');
    expect([day.getDate(), day.getMonth() + 1, day.getHours()]).toEqual([11, 9, 0]);
  });
});

describe('formatDate / formatDateTime', () => {
  it('server vaqti Toshkent bo\'yicha, jarayon zonasidan qat\'i nazar', () => {
    expect(formatDateTime('2026-09-11T19:06:41.202714')).toBe('11.09.2026, 19:06');
    expect(formatDateTime('2026-09-11T00:30:00')).toBe('11.09.2026, 00:30');
    expect(formatDate('2026-09-11T00:30:00')).toBe('11.09.2026');
    expect(formatDate('2026-09-11')).toBe('11.09.2026');
    expect(formatDateTime('2026-09-11T14:06:41Z')).toBe('11.09.2026, 19:06');
    expect(formatDate('')).toBe('—');
  });
});

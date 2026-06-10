import { describe, it, expect } from 'vitest';
import uz from './locales/uz.json';
import ru from './locales/ru.json';

type Json = Record<string, unknown>;

function flatKeys(obj: Json, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null
      ? flatKeys(v as Json, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
}

describe('i18n locale parity (uz <-> ru)', () => {
  it('uz and ru have identical key sets', () => {
    const uzKeys = flatKeys(uz as Json).sort();
    const ruKeys = flatKeys(ru as Json).sort();
    const missingInRu = uzKeys.filter((k) => !ruKeys.includes(k));
    const missingInUz = ruKeys.filter((k) => !uzKeys.includes(k));
    expect(missingInRu, 'ru.json da yetishmayotgan kalitlar').toEqual([]);
    expect(missingInUz, 'uz.json da yetishmayotgan kalitlar').toEqual([]);
  });

  it('exposes the ERP nav namespace in both languages', () => {
    expect((uz as Json).erp).toBeTruthy();
    expect((ru as Json).erp).toBeTruthy();
  });
});

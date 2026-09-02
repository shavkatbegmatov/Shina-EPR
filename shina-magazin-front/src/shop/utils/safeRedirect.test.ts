import { describe, expect, it } from 'vitest';
import { safeRedirect } from './safeRedirect';

describe('safeRedirect — ochiq redirect himoyasi', () => {
  it("ilova ichidagi yo'lni o'tkazadi", () => {
    expect(safeRedirect('/hisob/buyurtmalar?x=1', '/buyurtmalarim')).toBe('/hisob/buyurtmalar?x=1');
  });

  it("bo'sh qiymatda fallback", () => {
    expect(safeRedirect(null, '/buyurtmalarim')).toBe('/buyurtmalarim');
    expect(safeRedirect('', '/buyurtmalarim')).toBe('/buyurtmalarim');
  });

  it('protokol-nisbiy va mutlaq URL rad etiladi', () => {
    expect(safeRedirect('//evil.example/x', '/f')).toBe('/f');
    expect(safeRedirect('/\\evil.example', '/f')).toBe('/f');
    expect(safeRedirect('https://evil.example', '/f')).toBe('/f');
    expect(safeRedirect('javascript:alert(1)', '/f')).toBe('/f');
    expect(safeRedirect('hisob', '/f')).toBe('/f');
  });
});

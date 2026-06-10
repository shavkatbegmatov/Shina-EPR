import { describe, it, expect } from 'vitest';
import { BP, SHELL_DESKTOP } from './breakpoints';

describe('breakpoints', () => {
  it('BP scale is strictly ascending', () => {
    expect(BP.xs).toBeLessThan(BP.sm);
    expect(BP.sm).toBeLessThan(BP.md);
    expect(BP.md).toBeLessThan(BP.lg);
    expect(BP.lg).toBeLessThan(BP.xl);
  });

  it('SHELL_DESKTOP is the md (768px) tablet-chrome threshold', () => {
    expect(SHELL_DESKTOP).toBe(BP.md);
    expect(SHELL_DESKTOP).toBe(768);
  });
});

import { describe, expect, it } from 'vitest';
import {
  evaluatePassword,
  generateSecurePassword,
  GENERATED_PASSWORD_LENGTH,
  PASSWORD_MIN_LENGTH,
} from './passwordPolicy';

describe('passwordPolicy', () => {
  it('generates passwords that satisfy the policy', () => {
    for (let i = 0; i < 100; i += 1) {
      const password = generateSecurePassword();

      expect(password).toHaveLength(GENERATED_PASSWORD_LENGTH);
      expect(evaluatePassword(password).isValid).toBe(true);
    }
  });

  it('does not generate a password shorter than the policy minimum', () => {
    const password = generateSecurePassword(4);

    expect(password.length).toBeGreaterThanOrEqual(PASSWORD_MIN_LENGTH);
    expect(evaluatePassword(password).isValid).toBe(true);
  });

  it('rejects common weak password shapes', () => {
    expect(evaluatePassword('admin123').isValid).toBe(false);
    expect(evaluatePassword('NoSymbols1234').isValid).toBe(false);
    expect(evaluatePassword('With space 123!').isValid).toBe(false);
  });
});

export const PASSWORD_MIN_LENGTH = 12;
export const GENERATED_PASSWORD_LENGTH = 16;

export type PasswordRequirementCode =
  | 'minLength'
  | 'uppercase'
  | 'lowercase'
  | 'number'
  | 'symbol'
  | 'noSpaces';

export interface PasswordRequirementResult {
  code: PasswordRequirementCode;
  met: boolean;
  minLength?: number;
}

export interface PasswordEvaluation {
  requirements: PasswordRequirementResult[];
  score: number;
  maxScore: number;
  isValid: boolean;
}

const UPPERCASE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWERCASE_CHARS = 'abcdefghijkmnopqrstuvwxyz';
const NUMBER_CHARS = '23456789';
const SYMBOL_CHARS = '@#$%&*!?';
const ALL_PASSWORD_CHARS = UPPERCASE_CHARS + LOWERCASE_CHARS + NUMBER_CHARS + SYMBOL_CHARS;

function getRandomInt(maxExclusive: number): number {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Secure password generation requires crypto.getRandomValues().');
  }

  const values = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;

  do {
    globalThis.crypto.getRandomValues(values);
  } while (values[0] >= limit);

  return values[0] % maxExclusive;
}

function pickRandom(charset: string): string {
  return charset[getRandomInt(charset.length)];
}

function shuffleSecure(chars: string[]): string[] {
  const shuffled = [...chars];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = getRandomInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateSecurePassword(length = GENERATED_PASSWORD_LENGTH): string {
  const targetLength = Math.max(length, PASSWORD_MIN_LENGTH);
  const chars = [
    pickRandom(UPPERCASE_CHARS),
    pickRandom(LOWERCASE_CHARS),
    pickRandom(NUMBER_CHARS),
    pickRandom(SYMBOL_CHARS),
  ];

  while (chars.length < targetLength) {
    chars.push(pickRandom(ALL_PASSWORD_CHARS));
  }

  return shuffleSecure(chars).join('');
}

export function evaluatePassword(password: string): PasswordEvaluation {
  const requirements: PasswordRequirementResult[] = [
    {
      code: 'minLength',
      met: password.length >= PASSWORD_MIN_LENGTH,
      minLength: PASSWORD_MIN_LENGTH,
    },
    { code: 'uppercase', met: /[A-Z]/.test(password) },
    { code: 'lowercase', met: /[a-z]/.test(password) },
    { code: 'number', met: /[0-9]/.test(password) },
    { code: 'symbol', met: /[^A-Za-z0-9\s]/.test(password) },
    { code: 'noSpaces', met: password.length > 0 && !/\s/.test(password) },
  ];
  const score = requirements.filter((requirement) => requirement.met).length;

  return {
    requirements,
    score,
    maxScore: requirements.length,
    isValid: requirements.every((requirement) => requirement.met),
  };
}

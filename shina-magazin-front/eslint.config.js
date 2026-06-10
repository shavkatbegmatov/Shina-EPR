import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', 'coverage'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    // UI primitiv kutubxonasi (src/ui) — komponent + cva variantlari bir faylda
    // co-located bo'lishi standart (shadcn pattern). Fast-refresh granularligi
    // dizayn-tizim qatlami uchun muhim emas.
    files: ['src/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Layer 4 (app sahifalari) — xom brend-tashqi / FILL-only hex taqiqlanadi.
    // Ranglar src/ui/tokens, DaisyUI semantik tokenlar yoki useChartColors() dan kelishi kerak.
    files: ['src/pages/**/*.{ts,tsx}', 'src/portal/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/#(6366f1|8b5cf6|ea580c)/i]',
          message:
            "Xom brend-tashqi/FILL-only hex (#6366f1, #8b5cf6, #ea580c) yozmang. " +
            'src/ui/tokens, DaisyUI semantik tokenlar (text-primary, bg-secondary) yoki useChartColors() dan foydalaning.',
        },
      ],
    },
  }
);

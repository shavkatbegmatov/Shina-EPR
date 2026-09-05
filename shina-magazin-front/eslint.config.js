import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tseslint from 'typescript-eslint';

/**
 * jsx-a11y "recommended" qoidalari — hozircha WARN darajasida.
 *
 * Mavjud kod bazasida (DataTable klaviaturasiz, ikonka tugmalar aria-label'siz)
 * ko'p topilma bor; ularni bir zumda error qilish CI'ni (va u bilan deploy'ni)
 * to'xtatib qo'yardi. Warn ko'rinadi, PR'da tuzatiladi, keyin error'ga o'tkaziladi.
 */
const a11yAsWarnings = Object.fromEntries(
  Object.entries(jsxA11y.flatConfigs.recommended.rules).map(([rule, level]) => [
    rule,
    Array.isArray(level) ? ['warn', ...level.slice(1)] : 'warn',
  ])
);

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
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...a11yAsWarnings,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // ESKIRGAN qoida, plugin o'zi `label-has-associated-control` foydasiga
      // bekor qilgan. U label'dan `htmlFor` VA ichiga joylashtirishni BIR VAQTDA
      // talab qiladi — React'dagi odatiy `htmlFor` + `id` juftligi ham
      // ogohlantirish olardi. 205 topilmaning 115 tasi shundan edi, ya'ni haqiqiy
      // muammolarni ko'mib tashlardi. O'rnini bosuvchi qoida pastda yoqiq turibdi.
      'jsx-a11y/label-has-for': 'off',
    },
  },
  {
    // Node build skriptlari (scripts/*.mjs, masalan gen-seo.mjs) — Node globallari (process, console)
    files: ['scripts/**/*.{js,mjs}'],
    languageOptions: {
      globals: globals.node,
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

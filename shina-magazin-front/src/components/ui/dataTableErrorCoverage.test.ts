import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Har bir `<DataTable>` xato holatini ko'rsatishini kafolatlaydi.
 *
 * <p>Muammo: sahifalarda ro'yxat yuklash xatosi `catch { console.error(...) }`
 * bilan yutilardi. Foydalanuvchi bo'sh jadval va "Ma'lumot topilmadi" degan
 * yozuvni ko'rardi — bu YOLG'ON. Operator zaxira yo'q deb o'ylab, mavjud
 * mahsulotni sotmasdan qaytarib yuborishi mumkin edi. `DataTable`da tayyor
 * xato paneli bor edi, lekin jadvallarning aksariyati uni ishlatmasdi.
 *
 * <p>Bu test yangi jadval qo'shilganda `error` propi unutilsa yiqiladi.
 * Ataylab xato holatisiz qoldirilgan jadvallar quyida ro'yxatga olinadi —
 * ya'ni bu bilib turib qilingan qaror bo'ladi, e'tiborsizlik emas.
 */

/** Format: "<fayl>#<data propi>" — xato holati talab qilinmaydigan jadvallar. */
const ALLOWED_WITHOUT_ERROR = new Set([
  // Modal ichidagi mijoz tanlagich: xatosi asosiy POS oqimini to'smaydi —
  // kassir modalni yopib, mijozsiz savdoni davom ettira oladi.
  'pages/sales/POSPage.tsx#data={modalCustomers}',
  // Ta'minotchi kartochkasidagi ichki "xaridlar tarixi" jadvali — asosiy
  // ro'yxat emas; ta'minotchi yuklanmasa sahifa umuman ochilmaydi.
  'pages/suppliers/SuppliersPage.tsx#data={purchases}',
]);

function tsxFilesUnder(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(resolve(SRC, dir), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...tsxFilesUnder(join(dir, entry.name), rel));
    } else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) {
      out.push(`pages/${rel}`);
    }
  }
  return out;
}

/**
 * `<DataTable ... >` ochilish teglarini ajratib oladi.
 *
 * Ikki nozik joy bor:
 *  - props ichidagi `{...}` da `>` uchrashi mumkin (masalan `(o) => o.id`);
 *  - `<DataTable<ShopOrderDto>` ko'rinishidagi generik tur parametri — uni
 *    o'tkazib yubormasak, ajratgich o'sha yerda to'xtab, proplarni umuman
 *    ko'rmaydi va jadval "error propi yo'q" deb noto'g'ri belgilanadi.
 */
function dataTableBlocks(source: string): string[] {
  const blocks: string[] = [];
  let from = 0;
  for (;;) {
    const start = source.indexOf('<DataTable', from);
    if (start === -1) break;

    let i = start + '<DataTable'.length;

    // Generik tur parametri bo'lsa — mos `>` gacha o'tkazib yuboramiz
    if (source[i] === '<') {
      let generic = 0;
      for (; i < source.length; i++) {
        if (source[i] === '<') generic++;
        else if (source[i] === '>' && --generic === 0) { i++; break; }
      }
    }

    let depth = 0;
    for (; i < source.length; i++) {
      const ch = source[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (ch === '>' && depth === 0) break;
    }
    blocks.push(source.slice(start, i));
    from = i + 1;
  }
  return blocks;
}

function allTables(): { key: string; block: string }[] {
  return tsxFilesUnder('pages').flatMap((file) => {
    const source = readFileSync(resolve(SRC, file), 'utf-8');
    return dataTableBlocks(source).map((block) => ({
      key: `${file}#${block.match(/data=\{[^}]*\}/)?.[0] ?? '(data propi topilmadi)'}`,
      block,
    }));
  });
}

describe('DataTable xato holati qamrovi', () => {
  it('har bir <DataTable> `error` propini uzatadi', () => {
    const tables = allTables();
    expect(tables.length, 'jadvallar topilmadi — skanerlash buzilgan').toBeGreaterThan(5);

    const missing = tables
      .filter(({ block }) => !/\berror=/.test(block))
      .map(({ key }) => key)
      .filter((key) => !ALLOWED_WITHOUT_ERROR.has(key));

    expect(missing, [
      "Quyidagi jadvallarda `error` propi yo'q — yuklash xatosi bo'sh ro'yxat",
      "bo'lib ko'rinadi va foydalanuvchi ma'lumot yo'q deb o'ylaydi.",
      'Yechim: loadError state + error={loadError} onRetry={() => loadX(true)}.',
      "Ataylab shunday bo'lsa — ALLOWED_WITHOUT_ERROR ro'yxatiga sababi bilan qo'shing.",
    ].join('\n')).toEqual([]);
  });

  it("allowlist eskirmagan (har bir yozuv haqiqatan mavjud)", () => {
    const present = new Set(allTables().map(({ key }) => key));
    const stale = [...ALLOWED_WITHOUT_ERROR].filter((k) => !present.has(k));

    expect(stale, "allowlist'da endi mavjud bo'lmagan yozuvlar — tozalang").toEqual([]);
  });
});

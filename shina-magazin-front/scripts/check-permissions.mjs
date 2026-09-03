// Frontend PermissionCode xaritasi backend enum bilan MOS ekanini tekshiradi.
//
// Ikkalasi qo'lda yuritiladi (OpenAPI codegen yo'q). Ajralib ketsa ruxsat
// tekshiruvi jimgina noto'g'ri ishlaydi: frontend tugmani ko'rsatadi, backend
// 403 beradi (yoki aksincha). CI va `npm run check:permissions` ishlatadi.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const frontFile = resolve(here, '../src/config/permissions.ts');
const backFile = resolve(
  here,
  '../../shina-magazin-api/src/main/java/uz/shinamagazin/api/enums/PermissionCode.java'
);

const front = readFileSync(frontFile, 'utf8');
const back = readFileSync(backFile, 'utf8');

// Faqat `export const PermissionCode = { ... } as const;` bloki
const start = front.indexOf('export const PermissionCode = {');
const end = front.indexOf('} as const;', start);
if (start < 0 || end < 0) {
  console.error('config/permissions.ts ichida PermissionCode bloki topilmadi');
  process.exit(2);
}
const frontBlock = front.slice(start, end);

const frontCodes = new Set(
  [...frontBlock.matchAll(/^\s*([A-Z][A-Z0-9_]*):\s*'([A-Z][A-Z0-9_]*)'/gm)].map((m) => m[2])
);
const backCodes = new Set(
  [...back.matchAll(/^\s*([A-Z][A-Z0-9_]*)\s*\(\s*"/gm)].map((m) => m[1])
);

const missingInFront = [...backCodes].filter((code) => !frontCodes.has(code));
const missingInBack = [...frontCodes].filter((code) => !backCodes.has(code));

if (missingInFront.length || missingInBack.length) {
  console.error('PermissionCode MOS EMAS:');
  if (missingInFront.length) {
    console.error("  backend'da bor, frontend'da yo'q:", missingInFront.join(', '));
  }
  if (missingInBack.length) {
    console.error("  frontend'da bor, backend'da yo'q:", missingInBack.join(', '));
  }
  process.exit(1);
}

console.log(`PermissionCode mos: ${frontCodes.size} ta kod ikkala tomonda ham bor.`);

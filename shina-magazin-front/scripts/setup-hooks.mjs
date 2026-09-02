// `npm install` (prepare) paytida git hook'larni yoqadi: core.hooksPath = .githooks
//
// Ilgari bu qo'lda bir martalik qadam edi ("klondan keyin git config ..."). Yangi
// klon yoki yangi mashina hook'siz qolardi — aynan 2026 avgustda yetti commit prodga
// chiqmay qolgan holatning sababi. Endi npm install buni o'zi qiladi.
//
// Git yo'q (Docker build, CI'ning ba'zi muhitlari) yoki repo emas — jimgina o'tadi.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

if (process.env.CI || !existsSync(resolve(repoRoot, '.git')) || !existsSync(resolve(repoRoot, '.githooks'))) {
  process.exit(0);
}

try {
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { cwd: repoRoot, stdio: 'ignore' });
} catch {
  // git topilmadi yoki ishlamadi — hook'lar ixtiyoriy, o'rnatishni buzmaymiz
}

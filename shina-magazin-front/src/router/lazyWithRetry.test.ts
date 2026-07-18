import { beforeEach, describe, expect, it, vi } from 'vitest';
import { importWithReload, isChunkLoadError, shouldReloadForChunkError } from './lazyWithRetry';

describe('lazyWithRetry', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it.each([
    'Failed to fetch dynamically imported module: /assets/page-old.js',
    'error loading dynamically imported module',
    'Importing a module script failed',
    'ChunkLoadError: Loading chunk 42 failed',
    'Unable to preload CSS for /assets/page-old.css',
  ])('chunk yuklash xatosini taniydi: %s', (message) => {
    expect(isChunkLoadError(new TypeError(message))).toBe(true);
  });

  it('oddiy runtime xatosini chunk xatosi deb hisoblamaydi', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
  });

  it('bir URL uchun qisqa vaqt ichida faqat bir marta reloadga ruxsat beradi', () => {
    expect(shouldReloadForChunkError('https://protektor.uz/buyurtmalarim', 1_000)).toBe(true);
    expect(shouldReloadForChunkError('https://protektor.uz/buyurtmalarim', 2_000)).toBe(false);
    expect(shouldReloadForChunkError('https://protektor.uz/buyurtmalarim', 31_001)).toBe(true);
  });

  it('boshqa URLdagi chunk xatosi uchun reloadga ruxsat beradi', () => {
    expect(shouldReloadForChunkError('https://protektor.uz/katalog', 1_000)).toBe(true);
    expect(shouldReloadForChunkError('https://protektor.uz/buyurtmalarim', 2_000)).toBe(true);
  });

  it('muvaffaqiyatli import natijasini qaytaradi', async () => {
    const importer = vi.fn().mockResolvedValue({ default: 'page' });

    await expect(importWithReload(importer)).resolves.toEqual({ default: 'page' });
    expect(importer).toHaveBeenCalledOnce();
  });

  it('chunk bo‘lmagan import xatosini qayta tashlaydi', async () => {
    const error = new Error('Module evaluation failed');

    await expect(importWithReload(() => Promise.reject(error))).rejects.toBe(error);
  });
});

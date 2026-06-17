import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDocumentMeta } from './useDocumentMeta';

const metaContent = (attr: 'name' | 'property', key: string): string | null =>
  document.head.querySelector(`meta[${attr}="${key}"]`)?.getAttribute('content') ?? null;

describe('useDocumentMeta', () => {
  beforeEach(() => {
    document.title = '';
    document.head.querySelectorAll('meta').forEach((m) => {
      const isOg = m.getAttribute('property')?.startsWith('og:');
      const isDesc = m.getAttribute('name') === 'description';
      if (isOg || isDesc) m.remove();
    });
  });

  it('title ni sayt nomi bilan + og:title/og:site_name o\'rnatadi', () => {
    renderHook(() => useDocumentMeta({ title: 'Katalog' }));
    expect(document.title).toBe('Katalog · Protektor');
    expect(metaContent('property', 'og:title')).toBe('Katalog · Protektor');
    expect(metaContent('property', 'og:site_name')).toBe('Protektor');
  });

  it('bo\'sh title faqat sayt nomini beradi', () => {
    renderHook(() => useDocumentMeta({ title: '' }));
    expect(document.title).toBe('Protektor');
  });

  it('title undefined bo\'lsa hujjat sarlavhasini o\'zgartirmaydi', () => {
    document.title = 'Avvalgi';
    renderHook(() => useDocumentMeta({ description: 'faqat tavsif' }));
    expect(document.title).toBe('Avvalgi');
    expect(metaContent('name', 'description')).toBe('faqat tavsif');
  });

  it('description meta va og:description o\'rnatadi', () => {
    renderHook(() => useDocumentMeta({ title: 'X', description: 'Tavsif matni' }));
    expect(metaContent('name', 'description')).toBe('Tavsif matni');
    expect(metaContent('property', 'og:description')).toBe('Tavsif matni');
  });

  it('nisbiy image absolyut og:image ga aylantiriladi', () => {
    renderHook(() => useDocumentMeta({ title: 'X', image: '/img/a.jpg' }));
    expect(metaContent('property', 'og:image')).toBe(`${window.location.origin}/img/a.jpg`);
  });

  it('absolyut image o\'zgartirilmaydi', () => {
    renderHook(() => useDocumentMeta({ title: 'X', image: 'https://cdn.example.com/a.jpg' }));
    expect(metaContent('property', 'og:image')).toBe('https://cdn.example.com/a.jpg');
  });

  it('qayta render teglarni dublikatlamaydi (upsert)', () => {
    const { rerender } = renderHook(({ t }: { t: string }) => useDocumentMeta({ title: t }), {
      initialProps: { t: 'A' },
    });
    rerender({ t: 'B' });
    expect(document.head.querySelectorAll('meta[property="og:title"]')).toHaveLength(1);
    expect(metaContent('property', 'og:title')).toBe('B · Protektor');
  });
});

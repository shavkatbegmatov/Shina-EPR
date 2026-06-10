import { useEffect, useState } from 'react';

// Breakpoint qiymatlari (px) — tailwind.config.js screens bilan mos yagona manba.
export const BP = {
  xs: 480,
  sm: 640,
  md: 768, // ERP "desktop chrome" shu yerda yoqiladi (tablet+)
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/** ERP chrome (sidebar rail, jadval) yoqiladigan eng kichik kenglik. */
export const SHELL_DESKTOP = BP.md;

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';

function resolve(width: number): Breakpoint {
  if (width >= BP.xl) return 'wide';
  if (width >= BP.lg) return 'desktop';
  if (width >= BP.md) return 'tablet';
  return 'mobile';
}

/**
 * Joriy breakpointni qaytaradi (matchMedia/resize asosida).
 * JS mantig'i uchun (mas. POS ustun soni, drawer auto-close) — sof CSS yetmasa.
 */
export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() =>
    typeof window === 'undefined' ? 'desktop' : resolve(window.innerWidth),
  );

  useEffect(() => {
    const onResize = () => setBp(resolve(window.innerWidth));
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return bp;
}

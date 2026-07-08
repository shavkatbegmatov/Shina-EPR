import { useEffect, useState } from 'react';
import { CHART_SERIES } from '../tokens/colors';

export interface ChartColors {
  /** 8 ta kategoriyali seriya rangi */
  series: string[];
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  /** to'r (grid) chizig'i */
  grid: string;
  /** bar hover cursor to'rtburchagi */
  cursor: string;
}

function readVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function resolve(): ChartColors {
  const isDark =
    typeof document !== 'undefined' &&
    document.documentElement.dataset.theme === 'shina-dark';
  const fb = isDark ? CHART_SERIES.dark : CHART_SERIES.light;
  return {
    series: Array.from({ length: 8 }, (_, i) => readVar(`--chart-${i + 1}`, fb[i])),
    primary: readVar('--chart-primary', fb[0]),
    secondary: readVar('--chart-secondary', fb[1]),
    success: readVar('--chart-success', isDark ? '#34d399' : '#059669'),
    warning: readVar('--chart-warning', isDark ? '#fbbf24' : '#d97706'),
    error: readVar('--chart-error', isDark ? '#f87171' : '#dc2626'),
    info: readVar('--chart-info', isDark ? '#38bdf8' : '#0369a1'),
    grid: readVar('--chart-grid', isDark ? 'rgba(228,234,247,0.10)' : 'rgba(15,23,46,0.08)'),
    cursor: readVar('--chart-cursor', isDark ? 'rgba(125,155,255,0.14)' : 'rgba(100,116,139,0.12)'),
  };
}

/**
 * Tema-aware grafik ranglari. Foydalanuvchi shina <-> shina-dark almashtirganda
 * <html data-theme> o'zgaradi -> MutationObserver qayta hisoblaydi va grafiklar
 * yangilanadi. (Eski statik palitra dark-mode'da yangilanmay qolardi.)
 */
export function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(() => resolve());

  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setColors(resolve()));
    obs.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    // Mount'da CSS yuklangach qayta o'qiymiz (SSR/birinchi render fallback uchun).
    setColors(resolve());
    return () => obs.disconnect();
  }, []);

  return colors;
}

import type { ElementType, ReactNode } from 'react';

/**
 * Ta'minotchilar sahifasidagi kichik KPI karta.
 *
 * <p>Bir xil 12 qatorli markup sahifada SAKKIZ marta takrorlangan edi —
 * rangdan boshqa hech qanday farqsiz. `@/ui` dagi umumiy `StatCard` bu yerda
 * ishlatilmadi: uning ko'rinishi boshqacha va refaktor dizaynni
 * o'zgartirmasligi kerak.
 */
export function StatTile({
  icon: Icon,
  tone,
  label,
  value,
  valueClassName,
}: {
  icon: ElementType;
  /** Tailwind rang nomi: primary, warning, error, success, info. */
  tone: 'primary' | 'warning' | 'error' | 'success' | 'info';
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  // Tailwind sinflari TO'LIQ yozilishi shart: `bg-${tone}/10` kabi qurilgan
  // nom build paytida topilmay, rang umuman qo'llanmasdi.
  const toneClasses = {
    primary: 'bg-primary/10 text-primary',
    warning: 'bg-warning/10 text-warning',
    error: 'bg-error/10 text-error',
    success: 'bg-success/10 text-success',
    info: 'bg-info/10 text-info',
  }[tone];

  return (
    <div className="surface-card p-4">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2.5 ${toneClasses}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-base-content/60">{label}</p>
          <p className={`text-xl font-bold ${valueClassName ?? ''}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

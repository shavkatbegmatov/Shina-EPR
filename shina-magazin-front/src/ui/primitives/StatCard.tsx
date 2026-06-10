import type { CSSProperties, ElementType } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../utils/cn';

export type StatTone =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

const toneMap: Record<StatTone, string> = {
  primary: 'bg-primary/10 text-primary border-primary/20',
  secondary: 'bg-secondary/10 text-secondary border-secondary/20',
  accent: 'bg-accent/10 text-accent border-accent/20',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  error: 'bg-error/10 text-error border-error/20',
  info: 'bg-info/10 text-info border-info/20',
};

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: ElementType;
  /** o'zgarish foizi (musbat=yashil o'q, manfiy=qizil) */
  trend?: number;
  trendLabel?: string;
  tone?: StatTone;
  className?: string;
  style?: CSSProperties;
}

/** KPI karta — ERP dashboard va portal statistikalarini birlashtiradi. */
export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  tone = 'primary',
  className,
  style,
}: StatCardProps) {
  const isPositive = trend !== undefined && trend >= 0;

  return (
    <div
      className={cn(
        'surface-card group relative overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-lg',
        className,
      )}
      style={style}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-base-content/60">{title}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight lg:text-3xl">{value}</p>
            {trend !== undefined && (
              <div className="mt-3 flex items-center gap-1.5">
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold',
                    isPositive ? 'bg-success/10 text-success' : 'bg-error/10 text-error',
                  )}
                >
                  {isPositive ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {Math.abs(trend).toFixed(1)}%
                </span>
                {trendLabel && <span className="text-xs text-base-content/50">{trendLabel}</span>}
              </div>
            )}
          </div>
          <div className={cn('grid h-12 w-12 place-items-center rounded-2xl border', toneMap[tone])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </div>
    </div>
  );
}

import type { ElementType, ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface EmptyStateProps {
  icon?: ElementType;
  title: string;
  description?: string;
  /** ixtiyoriy harakat (mas. tugma) */
  action?: ReactNode;
  className?: string;
}

/** Bo'sh holat — ro'yxat/jadval bo'sh bo'lganda (xato holatidan farqli). */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-4 py-10 text-center', className)}>
      {Icon && (
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-base-200 text-base-content/40">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <div>
        <p className="font-semibold">{title}</p>
        {description && <p className="mt-1 text-sm text-base-content/60">{description}</p>}
      </div>
      {action}
    </div>
  );
}

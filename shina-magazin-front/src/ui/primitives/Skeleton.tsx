import { cn } from '../utils/cn';

/**
 * Yuklanish skeletoni — DaisyUI `skeleton` (pulse + token fon).
 * prefers-reduced-motion da animatsiya o'chadi (index.css).
 */
export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div className={cn('skeleton', className)} {...props} />;
}

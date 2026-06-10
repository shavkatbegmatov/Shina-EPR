import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

/** surface-card ustidan konteyner primitivi (index.css @layer dagi surface-card). */
export const cardVariants = cva('surface-card', {
  variants: {
    padding: { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' },
    elevation: { soft: '', strong: 'shadow-strong', flat: 'shadow-none' },
  },
  defaultVariants: { padding: 'md', elevation: 'soft' },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function Card({ className, padding, elevation, ...props }: CardProps) {
  return <div className={cn(cardVariants({ padding, elevation }), className)} {...props} />;
}

import { Loader2 } from 'lucide-react';

/**
 * Full-page loading spinner for lazy-loaded routes
 */
export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

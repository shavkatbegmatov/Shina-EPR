interface LoadingOverlayProps {
  show: boolean;
  message?: string;
}

/**
 * Loading overlay with backdrop blur effect
 *
 * Features:
 * - Semi-transparent background with blur
 * - Centered spinner and message
 * - Content underneath stays visible
 * - Customizable loading message
 *
 * @example
 * <div className="relative">
 *   <LoadingOverlay show={refreshing} message="Ma'lumotlar yangilanmoqda..." />
 *   // Your content here
 * </div>
 */
export function LoadingOverlay({ show, message = 'Yuklanmoqda...' }: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center
                    rounded-xl bg-base-100/60 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <span className="text-sm font-medium text-base-content/70">
          {message}
        </span>
      </div>
    </div>
  );
}

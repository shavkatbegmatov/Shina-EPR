import type { ReactNode } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';

/**
 * Modal — @headlessui/react Dialog ustida. Focus-trap, scroll-lock, ESC, tashqariga
 * bosish va aria (role=dialog, aria-modal, aria-labelledby) avtomatik beriladi.
 */
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** pastki harakatlar (footer) sloti */
  footer?: ReactNode;
  size?: ModalSize;
  /** yuqori o'ng yopish tugmasi (default: true) */
  closeButton?: boolean;
  /** panel uchun qo'shimcha klasslar */
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeButton = true,
  className,
}: ModalProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-modal">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition duration-200 data-[closed]:opacity-0"
      />
      <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
        <DialogPanel
          transition
          className={cn(
            'w-full rounded-2xl border border-base-200 bg-base-100 shadow-strong transition duration-200',
            'data-[closed]:scale-95 data-[closed]:opacity-0',
            sizeMap[size],
            className,
          )}
        >
          {(title || closeButton) && (
            <div className="flex items-start justify-between gap-4 border-b border-base-200 px-5 py-4">
              <div className="min-w-0">
                {title && (
                  <DialogTitle className="text-lg font-semibold leading-tight">{title}</DialogTitle>
                )}
                {description && (
                  <p className="mt-1 text-sm text-base-content/60">{description}</p>
                )}
              </div>
              {closeButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-ghost btn-sm btn-square -mr-2 -mt-1"
                  aria-label="Yopish"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          )}

          {children && <div className="px-5 py-4">{children}</div>}

          {footer && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-base-200 px-5 py-4">
              {footer}
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}

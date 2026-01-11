import { ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import clsx from 'clsx';

// =============================================================================
// ModalPortal - Simple portal wrapper for existing modal content
// =============================================================================
interface ModalPortalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function ModalPortal({ isOpen, onClose, children }: ModalPortalProps) {
  // Handle escape key and body overflow
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Backdrop - click to close */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      {/* Modal content wrapper */}
      <div className="relative z-10" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// =============================================================================
// Modal - Full featured modal component
// =============================================================================
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = '3xl',
  showCloseButton = true,
  closeOnBackdrop = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Focus trap - focus modal when opened
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
      onClick={handleBackdropClick}
    >
      {/* Modal content */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={clsx(
          'relative w-full bg-base-100 rounded-2xl shadow-2xl animate-fade-up',
          'max-h-[90vh] overflow-y-auto',
          maxWidthClasses[maxWidth]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-base-200 bg-base-100 p-4 sm:p-6">
            {title && (
              <div>
                <h3 className="text-xl font-semibold">{title}</h3>
                {subtitle && <p className="mt-1 text-sm text-base-content/60">{subtitle}</p>}
              </div>
            )}
            {showCloseButton && (
              <button
                className="btn btn-ghost btn-sm btn-square shrink-0"
                onClick={onClose}
                aria-label="Yopish"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );

  // Use portal to render modal at document body level
  return createPortal(modalContent, document.body);
}

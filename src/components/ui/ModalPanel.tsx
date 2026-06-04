import type { ReactNode } from 'react';

/** Centered on desktop; bottom sheet style on small screens. */
export function ModalPanel({
  children,
  className = '',
  maxWidth = 'max-w-lg',
}: {
  children: ReactNode;
  className?: string;
  maxWidth?: string;
}) {
  return (
    <div
      className={`fixed z-50 flex max-h-[min(92dvh,calc(100vh-1rem))] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl ${maxWidth} inset-x-0 bottom-0 md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:max-h-[90vh] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl ${className}`}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>
  );
}

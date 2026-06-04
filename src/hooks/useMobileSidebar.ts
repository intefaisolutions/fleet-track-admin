import { useCallback, useEffect, useState } from 'react';

const DESKTOP_MEDIA = '(min-width: 768px)';

/** Mobile drawer open state; auto-closes when viewport becomes desktop. */
export function useMobileSidebar() {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MEDIA);
    const onChange = () => {
      if (mq.matches) setOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return { open, setOpen, close, toggle };
}

export function mobileSidebarAsideClass(open: boolean) {
  return [
    'fixed left-0 top-0 z-50 flex h-[100dvh] w-[min(18rem,88vw)] max-w-full flex-col transition-transform duration-200 ease-out',
    'md:z-40 md:w-64 md:translate-x-0',
    open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
  ].join(' ');
}

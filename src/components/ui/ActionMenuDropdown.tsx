import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

const MENU_GAP = 4;
const VIEWPORT_PADDING = 8;
const DEFAULT_MENU_WIDTH = 176;

type ActionMenuDropdownProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
  menuWidth?: number;
  ariaLabel?: string;
};

export function ActionMenuDropdown({
  open,
  onOpenChange,
  trigger,
  children,
  menuWidth = DEFAULT_MENU_WIDTH,
  ariaLabel = 'Actions',
}: ActionMenuDropdownProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const updatePosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    const menuEl = menuRef.current;
    if (!triggerEl || !menuEl) return;

    const rect = triggerEl.getBoundingClientRect();
    const menuHeight = menuEl.offsetHeight;
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING;
    const spaceAbove = rect.top - VIEWPORT_PADDING;
    const openAbove = spaceBelow < menuHeight + MENU_GAP && spaceAbove >= spaceBelow;

    const top = openAbove
      ? Math.max(VIEWPORT_PADDING, rect.top - menuHeight - MENU_GAP)
      : Math.min(
          window.innerHeight - menuHeight - VIEWPORT_PADDING,
          rect.bottom + MENU_GAP,
        );

    const left = Math.min(
      Math.max(VIEWPORT_PADDING, rect.right - menuWidth),
      window.innerWidth - menuWidth - VIEWPORT_PADDING,
    );

    setCoords({ top, left });
  }, [menuWidth]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updatePosition();
  }, [open, updatePosition, children]);

  useEffect(() => {
    if (!open) return;

    const close = () => onOpenChange(false);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onOpenChange, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      onOpenChange(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, onOpenChange]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => onOpenChange(!open)}
        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {trigger}
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              top: coords?.top ?? -9999,
              left: coords?.left ?? -9999,
              width: menuWidth,
              visibility: coords ? 'visible' : 'hidden',
            }}
            className="fixed z-[200] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}

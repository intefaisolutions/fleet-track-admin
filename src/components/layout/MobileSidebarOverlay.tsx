export function MobileSidebarOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <button
      type="button"
      className="fixed inset-0 z-40 bg-slate-900/50 md:hidden"
      onClick={onClose}
      aria-label="Close navigation menu"
    />
  );
}

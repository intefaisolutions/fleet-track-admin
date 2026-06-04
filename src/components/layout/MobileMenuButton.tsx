import { Menu } from 'lucide-react';

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-1 rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
      aria-label="Open menu"
    >
      <Menu className="h-6 w-6" />
    </button>
  );
}

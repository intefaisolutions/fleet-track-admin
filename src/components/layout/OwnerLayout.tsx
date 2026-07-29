import { Outlet } from 'react-router-dom';
import { useMobileSidebar } from '../../hooks/useMobileSidebar';
import { ExpenseOfflineSyncBootstrap } from '../expenses/ExpenseOfflineSyncBootstrap';
import { MobileSidebarOverlay } from './MobileSidebarOverlay';
import { OwnerSidebar } from './OwnerSidebar';
import { OwnerTopBar } from './OwnerTopBar';

export function OwnerLayout() {
  const { open, close, toggle } = useMobileSidebar();

  return (
    <div className="h-[100dvh] overflow-hidden bg-surface">
      <ExpenseOfflineSyncBootstrap />
      <div className="no-print" data-print-hide="true">
        <OwnerSidebar mobileOpen={open} onNavigate={close} />
        <MobileSidebarOverlay open={open} onClose={close} />
      </div>
      <div className="print-content-shell flex h-[100dvh] min-w-0 flex-col md:ml-64">
        <div className="no-print shrink-0" data-print-hide="true">
          <OwnerTopBar onMenuClick={toggle} />
        </div>
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
        <footer className="no-print shrink-0 border-t border-slate-200 bg-white px-4 py-3 text-center text-xs text-slate-400 md:px-6">
          © FleetTrack — Vehicle Owner Portal
        </footer>
      </div>
    </div>
  );
}

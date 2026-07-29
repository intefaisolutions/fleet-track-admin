import { Outlet } from 'react-router-dom';
import { useMobileSidebar } from '../../hooks/useMobileSidebar';
import { MobileSidebarOverlay } from './MobileSidebarOverlay';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AdminLayout() {
  const { open, close, toggle } = useMobileSidebar();

  return (
    <div className="h-[100dvh] overflow-hidden bg-surface">
      <div className="no-print" data-print-hide="true">
        <Sidebar mobileOpen={open} onNavigate={close} />
        <MobileSidebarOverlay open={open} onClose={close} />
      </div>
      <div className="print-content-shell flex h-[100dvh] min-w-0 flex-col md:ml-64">
        <div className="no-print shrink-0" data-print-hide="true">
          <TopBar onMenuClick={toggle} />
        </div>
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

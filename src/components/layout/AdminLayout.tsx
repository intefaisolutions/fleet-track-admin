import { Outlet } from 'react-router-dom';
import { useMobileSidebar } from '../../hooks/useMobileSidebar';
import { MobileSidebarOverlay } from './MobileSidebarOverlay';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AdminLayout() {
  const { open, close, toggle } = useMobileSidebar();

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar mobileOpen={open} onNavigate={close} />
      <MobileSidebarOverlay open={open} onClose={close} />
      <div className="flex min-h-screen min-w-0 flex-col md:ml-64">
        <TopBar onMenuClick={toggle} />
        <main className="flex-1 overflow-x-hidden p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

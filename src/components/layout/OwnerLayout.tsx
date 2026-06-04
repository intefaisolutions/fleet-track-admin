import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useMobileSidebar } from '../../hooks/useMobileSidebar';
import { MobileSidebarOverlay } from './MobileSidebarOverlay';
import { OwnerSidebar } from './OwnerSidebar';
import { OwnerTopBar } from './OwnerTopBar';

export function OwnerLayout() {
  const [search, setSearch] = useState('');
  const { open, close, toggle } = useMobileSidebar();

  return (
    <div className="min-h-screen bg-surface">
      <OwnerSidebar mobileOpen={open} onNavigate={close} />
      <MobileSidebarOverlay open={open} onClose={close} />
      <div className="flex min-h-screen min-w-0 flex-col md:ml-64">
        <OwnerTopBar search={search} onSearchChange={setSearch} onMenuClick={toggle} />
        <main className="flex-1 overflow-x-hidden p-4 md:p-6">
          <Outlet context={{ search }} />
        </main>
        <footer className="border-t border-slate-200 bg-white px-4 py-3 text-center text-xs text-slate-400 md:px-6">
          © FleetTrack — Vehicle Owner Portal
        </footer>
      </div>
    </div>
  );
}

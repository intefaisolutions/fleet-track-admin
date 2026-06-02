import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { OwnerSidebar } from './OwnerSidebar';
import { OwnerTopBar } from './OwnerTopBar';

export function OwnerLayout() {
  const [search, setSearch] = useState('');

  return (
    <div className="min-h-screen bg-surface">
      <OwnerSidebar />
      <div className="ml-64 flex min-h-screen flex-col">
        <OwnerTopBar search={search} onSearchChange={setSearch} />
        <main className="flex-1 p-6">
          <Outlet context={{ search }} />
        </main>
        <footer className="border-t border-slate-200 bg-white px-6 py-3 text-center text-xs text-slate-400">
          © FleetTrack — Vehicle Owner Portal
        </footer>
      </div>
    </div>
  );
}

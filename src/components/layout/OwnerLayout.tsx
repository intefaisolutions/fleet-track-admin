import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { OwnerSidebar } from './OwnerSidebar';
import { OwnerTopBar } from './OwnerTopBar';

export function OwnerLayout() {
  const [search, setSearch] = useState('');

  return (
    <div className="min-h-screen bg-slate-100">
      <OwnerSidebar />
      <div className="ml-64 flex min-h-screen flex-col">
        <OwnerTopBar search={search} onSearchChange={setSearch} />
        <main className="flex-1 p-6">
          <Outlet context={{ search }} />
        </main>
      </div>
    </div>
  );
}

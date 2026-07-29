import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useMobileSidebar } from '../../hooks/useMobileSidebar';
import { companiesService } from '../../services/companies.service';
import { CompanySidebar } from './CompanySidebar';
import { CompanyTopBar } from './CompanyTopBar';
import { MobileSidebarOverlay } from './MobileSidebarOverlay';

export function CompanyLayout() {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState<string>();
  const { open, close, toggle } = useMobileSidebar();

  useEffect(() => {
    if (!user?.companyId) return;
    companiesService
      .getById(user.companyId)
      .then((res) => {
        const data = res.data as { name?: string } | undefined;
        if (data?.name) setCompanyName(data.name);
      })
      .catch(() => {});
  }, [user?.companyId]);

  return (
    <div className="h-[100dvh] overflow-hidden bg-surface">
      <div className="no-print" data-print-hide="true">
        <CompanySidebar mobileOpen={open} onNavigate={close} />
        <MobileSidebarOverlay open={open} onClose={close} />
      </div>
      <div className="print-content-shell flex h-[100dvh] min-w-0 flex-col md:ml-64">
        <div className="no-print shrink-0" data-print-hide="true">
          <CompanyTopBar companyName={companyName} onMenuClick={toggle} />
        </div>
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
          <Outlet context={{ companyName }} />
        </main>
        <footer className="no-print shrink-0 border-t border-slate-200 bg-white px-4 py-3 text-center text-xs text-slate-400 md:px-6">
          © 2024 FleetTrack Management Systems. All rights reserved. Version 4.2.1-stable
        </footer>
      </div>
    </div>
  );
}

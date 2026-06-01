import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { CompanySidebar } from './CompanySidebar';
import { CompanyTopBar } from './CompanyTopBar';
import { useAuth } from '../../context/AuthContext';
import { companiesService } from '../../services/companies.service';

export function CompanyLayout() {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState<string>();

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
    <div className="min-h-screen bg-surface">
      <CompanySidebar />
      <div className="ml-64 flex min-h-screen flex-col">
        <CompanyTopBar companyName={companyName} />
        <main className="flex-1 p-6">
          <Outlet context={{ companyName }} />
        </main>
        <footer className="border-t border-slate-200 bg-white px-6 py-3 text-center text-xs text-slate-400">
          © 2024 FleetTrack Management Systems. All rights reserved. Version 4.2.1-stable
        </footer>
      </div>
    </div>
  );
}

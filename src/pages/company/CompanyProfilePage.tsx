import { UserCircle } from 'lucide-react';
import { AdminProfileSection } from '../../components/admin/AdminProfileSection';
import { useAuth } from '../../context/AuthContext';

export function CompanyProfilePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-8 text-white shadow-sm">
        <div className="relative z-10 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
            Account
          </p>
          <h1 className="mt-2 text-3xl font-bold">My Profile</h1>
          <p className="mt-2 text-sm text-white/80">
            View and update your personal details and password
            {user?.fullName ? ` — ${user.fullName}` : ''}.
          </p>
        </div>
        <div className="absolute right-8 top-1/2 hidden -translate-y-1/2 md:block" aria-hidden>
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-fleet-500/20">
            <UserCircle className="h-10 w-10 text-fleet-300" />
          </div>
        </div>
      </div>

      <AdminProfileSection />
    </div>
  );
}

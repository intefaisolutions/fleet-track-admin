import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { platformService } from '../../services/platform.service';
import { getApiErrorMessage } from '../../utils/validation';

export function PricingPage() {
  const [plans, setPlans] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    platformService
      .getPlans()
      .then((res) => setPlans((res.data as Record<string, unknown>[]) ?? []))
      .catch((err) => toast.error(getApiErrorMessage(err, 'Failed to load plans')));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Pricing Settings</h1>
      <p className="text-sm text-slate-500">SRS subscription plans — default pricing from platform.</p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => (
          <div key={String(p.planType)} className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-bold text-slate-900">{String(p.planType)}</h3>
            <p className="mt-2 text-2xl font-semibold text-fleet-600">
              ₹{String(p.monthlyPriceInr)}/mo
            </p>
            <p className="text-sm text-slate-500">₹{String(p.yearlyPriceInr)}/year</p>
            <ul className="mt-3 space-y-1 text-sm text-slate-600">
              <li>Up to {String(p.vehicleLimit)} vehicles</li>
              <li>{String(p.maxOwners)} owners</li>
              <li>{String(p.maxDrivers)} drivers</li>
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

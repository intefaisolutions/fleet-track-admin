import { Truck } from 'lucide-react';

export function AuthPageBrand() {
  return (
    <div className="mb-10 flex items-center gap-2">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
        style={{ backgroundColor: '#00AEEF' }}
      >
        <Truck className="h-5 w-5" />
      </div>
      <span className="text-lg font-bold text-slate-900">FleetTrack</span>
    </div>
  );
}

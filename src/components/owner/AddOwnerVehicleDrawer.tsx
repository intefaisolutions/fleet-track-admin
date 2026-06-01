import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { CloudUpload, Save, X } from 'lucide-react';
import { driversService, type DriverRecord } from '../../services/drivers.service';
import {
  vehiclesService,
  type CreateVehiclePayload,
} from '../../services/vehicles.service';
import { getApiErrorMessage } from '../../utils/validation';

const VEHICLE_TYPES = [
  { value: 'TRUCK', label: 'Heavy Truck' },
  { value: 'VAN', label: 'Van' },
  { value: 'CAR', label: 'Car' },
  { value: 'BIKE', label: 'Bike' },
  { value: 'OTHER', label: 'Other' },
] as const;

const FUEL_TYPES = ['Diesel', 'Petrol', 'Electric', 'CNG', 'Hybrid'];

const emptyForm = {
  registrationNumber: '',
  modelName: '',
  year: '2024',
  type: 'TRUCK' as CreateVehiclePayload['type'],
  fuelType: 'Diesel',
  currentOdometerKm: '0',
  purchaseDate: '',
  purchaseCost: '0.00',
  assignedDriverId: '',
  imageUrl: '',
};

export function AddOwnerVehicleDrawer({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState(emptyForm);
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    driversService
      .list()
      .then((res) => setDrivers(res.data ?? []))
      .catch(() => setDrivers([]));
  }, [open]);

  if (!open) return null;

  const handleImage = (file: File | null) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setForm((f) => ({ ...f, imageUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: CreateVehiclePayload = {
        registrationNumber: form.registrationNumber.trim(),
        modelName: form.modelName.trim(),
        type: form.type,
        fuelType: form.fuelType,
        year: Number(form.year) || undefined,
        currentOdometerKm: Number(form.currentOdometerKm) || 0,
        purchaseDate: form.purchaseDate || undefined,
        purchaseCost: Number(form.purchaseCost) || undefined,
        assignedDriverId: form.assignedDriverId || undefined,
        imageUrl: form.imageUrl || undefined,
        status: 'ACTIVE',
      };
      await vehiclesService.create(payload);
      toast.success('Vehicle saved');
      setForm(emptyForm);
      setImagePreview(null);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to save vehicle'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-slate-900/40"
        onClick={onClose}
        aria-label="Close panel"
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Add New Vehicle</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Enter the details of the new fleet asset.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Registration No.
                </label>
                <input
                  required
                  placeholder="e.g. NY-988-X2"
                  value={form.registrationNumber}
                  onChange={(e) =>
                    setForm({ ...form, registrationNumber: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Vehicle Model
                </label>
                <input
                  required
                  placeholder="e.g. Freightliner Cascadia"
                  value={form.modelName}
                  onChange={(e) => setForm({ ...form, modelName: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Year
                </label>
                <input
                  type="number"
                  min={1990}
                  max={2100}
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      type: e.target.value as CreateVehiclePayload['type'],
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
                >
                  {VEHICLE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Fuel Type
                </label>
                <select
                  value={form.fuelType}
                  onChange={(e) => setForm({ ...form, fuelType: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
                >
                  {FUEL_TYPES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Current Odometer (KM)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.currentOdometerKm}
                  onChange={(e) =>
                    setForm({ ...form, currentOdometerKm: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Purchase Cost ($)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.purchaseCost}
                  onChange={(e) => setForm({ ...form, purchaseCost: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Assign Driver
              </label>
              <select
                value={form.assignedDriverId}
                onChange={(e) =>
                  setForm({ ...form, assignedDriverId: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
              >
                <option value="">Select a driver...</option>
                {drivers.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Vehicle Image
              </label>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center hover:border-fleet-400 hover:bg-fleet-50/30">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt=""
                    className="mb-2 max-h-32 rounded-lg object-cover"
                  />
                ) : (
                  <CloudUpload className="mb-2 h-8 w-8 text-slate-400" />
                )}
                <span className="text-sm font-medium text-slate-700">
                  Click to upload or drag & drop
                </span>
                <span className="mt-1 text-xs text-slate-400">PNG, JPG up to 10MB</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="sr-only"
                  onChange={(e) => handleImage(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>

          <div className="border-t border-slate-100 p-6">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-fleet-500 py-3 text-sm font-semibold text-white hover:bg-fleet-600 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Vehicle'}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

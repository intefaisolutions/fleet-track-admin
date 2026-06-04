import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { CloudUpload, Save, X } from 'lucide-react';
import { driversService, type DriverRecord } from '../../services/drivers.service';
import {
  vehiclesService,
  type CreateVehiclePayload,
  type VehicleRecord,
} from '../../services/vehicles.service';
import { uploadImage } from '../../services/storage.service';
import { getApiErrorMessage } from '../../utils/validation';

const VEHICLE_TYPES = [
  { value: 'TRUCK', label: 'Truck' },
  { value: 'VAN', label: 'Van' },
  { value: 'CAR', label: 'Car' },
  { value: 'BIKE', label: 'Auto' },
  { value: 'OTHER', label: 'Other' },
] as const;

const FUEL_TYPES = ['Petrol', 'Diesel', 'CNG', 'Electric'];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: currentYear - 1989 }, (_, i) => currentYear - i);

const emptyForm = {
  registrationNumber: '',
  modelName: '',
  make: '',
  year: String(currentYear),
  type: 'TRUCK' as CreateVehiclePayload['type'],
  fuelType: 'Diesel',
  currentOdometerKm: '0',
  purchaseDate: '',
  purchaseCost: '',
  assignedDriverId: '',
  imageUrl: '',
  status: 'ACTIVE',
};

function driverIdFromRef(
  ref?: VehicleRecord['assignedDriverId'],
): string {
  if (!ref) return '';
  if (typeof ref === 'string') return ref;
  return ref._id ?? '';
}

function isoDateForInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function vehicleToForm(v: VehicleRecord) {
  return {
    registrationNumber: v.registrationNumber ?? '',
    modelName: v.modelName ?? '',
    make: v.make ?? '',
    year: v.year ? String(v.year) : String(currentYear),
    type: (v.vehicleType ?? 'TRUCK') as CreateVehiclePayload['type'],
    fuelType: v.fuelType ?? 'Diesel',
    currentOdometerKm: String(v.currentOdometerKm ?? 0),
    purchaseDate: isoDateForInput(v.purchaseDate),
    purchaseCost: v.purchaseCost != null ? String(v.purchaseCost) : '',
    assignedDriverId: driverIdFromRef(v.assignedDriverId),
    imageUrl: v.imageUrl ?? '',
    status: v.status ?? 'ACTIVE',
  };
}

export function OwnerVehicleFormDrawer({
  open,
  vehicle,
  onClose,
  onSuccess,
}: {
  open: boolean;
  vehicle?: VehicleRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = Boolean(vehicle?._id);
  const [form, setForm] = useState(emptyForm);
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    driversService
      .list()
      .then((res) => setDrivers(res.data ?? []))
      .catch(() => setDrivers([]));
    if (vehicle) {
      setForm(vehicleToForm(vehicle));
      setImagePreview(vehicle.imageUrl ?? null);
    } else {
      setForm(emptyForm);
      setImagePreview(null);
    }
  }, [open, vehicle]);

  if (!open) return null;

  const handleImage = async (file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setUploadingImage(true);
    try {
      const { url } = await uploadImage(file, 'vehicles');
      setImagePreview(url);
      setForm((f) => ({ ...f, imageUrl: url }));
      toast.success('Vehicle photo uploaded');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Photo upload failed'));
    } finally {
      setUploadingImage(false);
    }
  };

  const buildPayload = (): Partial<CreateVehiclePayload> => ({
    registrationNumber: form.registrationNumber.trim(),
    modelName: form.modelName.trim(),
    make: form.make.trim() || undefined,
    type: form.type,
    fuelType: form.fuelType,
    year: Number(form.year) || undefined,
    currentOdometerKm: Number(form.currentOdometerKm) || 0,
    purchaseDate: form.purchaseDate || undefined,
    purchaseCost: form.purchaseCost ? Number(form.purchaseCost) : undefined,
    assignedDriverId: form.assignedDriverId || undefined,
    imageUrl: form.imageUrl || undefined,
    status: form.status as CreateVehiclePayload['status'],
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = buildPayload();
      if (isEdit && vehicle) {
        await vehiclesService.update(vehicle._id, payload);
        toast.success('Vehicle updated');
      } else {
        await vehiclesService.create(payload as CreateVehiclePayload);
        toast.success('Vehicle registered');
        setForm(emptyForm);
        setImagePreview(null);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, isEdit ? 'Update failed' : 'Failed to add vehicle'));
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
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEdit ? 'Edit Vehicle' : 'Add Vehicle'}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {isEdit
                ? 'Update vehicle details, odometer, and assigned driver.'
                : 'Register a new vehicle with all required details.'}
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
                  Registration Number *
                </label>
                <input
                  required
                  placeholder="HR 26 AB 1234"
                  value={form.registrationNumber}
                  onChange={(e) =>
                    setForm({ ...form, registrationNumber: e.target.value.toUpperCase() })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm uppercase outline-none focus:border-fleet-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Vehicle Model *
                </label>
                <input
                  required
                  placeholder="Tata Ace / Mahindra Bolero"
                  value={form.modelName}
                  onChange={(e) => setForm({ ...form, modelName: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Make (optional)
                </label>
                <input
                  placeholder="Tata / Mahindra"
                  value={form.make}
                  onChange={(e) => setForm({ ...form, make: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Year of Manufacture *
                </label>
                <select
                  required
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Vehicle Type *
                </label>
                <select
                  required
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
                  Fuel Type *
                </label>
                <select
                  required
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
                  Current Odometer (km) *
                </label>
                <input
                  type="number"
                  min={0}
                  required
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
                  Purchase Cost (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={form.purchaseCost}
                  onChange={(e) => setForm({ ...form, purchaseCost: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
                />
              </div>
              {isEdit && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="RETIRED">Retired</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Assigned Driver (optional)
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
                Vehicle Image (optional)
              </label>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center hover:border-fleet-400">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt=""
                    className="mb-2 max-h-32 rounded-lg object-cover"
                  />
                ) : (
                  <CloudUpload className="mb-2 h-8 w-8 text-slate-400" />
                )}
                <span className="text-sm font-medium text-slate-700">Click to upload</span>
                <span className="mt-1 text-xs text-slate-400">
                  {uploadingImage ? 'Uploading to Supabase…' : 'PNG, JPG up to 5MB'}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="sr-only"
                  disabled={uploadingImage}
                  onChange={(e) => void handleImage(e.target.files?.[0] ?? null)}
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
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

/** @deprecated use OwnerVehicleFormDrawer */
export const AddOwnerVehicleDrawer = OwnerVehicleFormDrawer;

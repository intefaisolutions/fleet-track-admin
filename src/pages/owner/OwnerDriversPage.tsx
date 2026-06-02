import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Eye,
  Info,
  Link2,
  RefreshCw,
  UserMinus,
  Users,
} from 'lucide-react';
import { driversService, type DriverRecord } from '../../services/drivers.service';
import {
  vehiclesService,
  type VehicleRecord,
} from '../../services/vehicles.service';
import { OwnerDriverDetailModal } from '../../components/owner/OwnerDriverDetailModal';
import { OwnerAssignDriverModal } from '../../components/owner/OwnerAssignDriverModal';
import { getApiErrorMessage } from '../../utils/validation';

function driverId(ref?: VehicleRecord['assignedDriverId']): string {
  if (!ref) return '';
  if (typeof ref === 'string') return ref;
  return ref._id ?? '';
}

function driverName(ref?: VehicleRecord['assignedDriverId']): string {
  if (!ref) return '';
  if (typeof ref === 'object' && ref.fullName) return ref.fullName;
  return '';
}

function findVehicleForDriver(driverIdValue: string, vehicles: VehicleRecord[]) {
  return vehicles.find((v) => driverId(v.assignedDriverId) === driverIdValue);
}

export function OwnerDriversPage() {
  const { search = '' } = useOutletContext<{ search?: string }>();
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailDriver, setDetailDriver] = useState<DriverRecord | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<'assign' | 'change'>('assign');
  const [assignDriverId, setAssignDriverId] = useState<string>();
  const [assignVehicleId, setAssignVehicleId] = useState<string>();
  const [busyVehicleId, setBusyVehicleId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.allSettled([driversService.list(), vehiclesService.list()])
      .then(([driversRes, vehiclesRes]) => {
        if (driversRes.status === 'fulfilled') {
          const driverList = driversRes.value.data ?? [];
          setDrivers(
            driverList.filter((d) => d.status === 'ACTIVE' || d.status === 'active'),
          );
        } else {
          setDrivers([]);
          toast.error(getApiErrorMessage(driversRes.reason, 'Failed to load drivers'));
        }
        if (vehiclesRes.status === 'fulfilled') {
          setVehicles(vehiclesRes.value.data ?? []);
        } else {
          setVehicles([]);
          toast.error(getApiErrorMessage(vehiclesRes.reason, 'Failed to load vehicles'));
        }
      })
      .catch((err: unknown) => {
        setDrivers([]);
        setVehicles([]);
        toast.error(getApiErrorMessage(err, 'Failed to load driver data'));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const q = search.trim().toLowerCase();

  const filteredDrivers = useMemo(() => {
    if (!q) return drivers;
    return drivers.filter(
      (d) =>
        d.fullName.toLowerCase().includes(q) ||
        d.phone.includes(q) ||
        (d.licenseNumber ?? '').toLowerCase().includes(q),
    );
  }, [drivers, q]);

  const filteredVehicles = useMemo(() => {
    if (!q) return vehicles;
    return vehicles.filter(
      (v) =>
        v.registrationNumber.toLowerCase().includes(q) ||
        driverName(v.assignedDriverId).toLowerCase().includes(q),
    );
  }, [vehicles, q]);

  const openAssign = (driverIdValue?: string, vehicleIdValue?: string) => {
    setAssignMode('assign');
    setAssignDriverId(driverIdValue);
    setAssignVehicleId(vehicleIdValue);
    setAssignOpen(true);
  };

  const openChange = (vehicle: VehicleRecord) => {
    setAssignMode('change');
    setAssignVehicleId(vehicle._id);
    setAssignDriverId(undefined);
    setAssignOpen(true);
  };

  const handleUnassign = async (vehicle: VehicleRecord) => {
    const name = driverName(vehicle.assignedDriverId) || 'driver';
    if (
      !window.confirm(
        `Unassign ${name} from ${vehicle.registrationNumber}? The vehicle will have no driver.`,
      )
    ) {
      return;
    }

    setBusyVehicleId(vehicle._id);
    try {
      await vehiclesService.update(vehicle._id, { assignedDriverId: null });
      toast.success('Driver unassigned');
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to unassign driver'));
    } finally {
      setBusyVehicleId(null);
    }
  };


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Driver Management</h1>
        <p className="mt-1 text-sm text-slate-500">
          Assign, reassign, or unassign drivers to your vehicles. Drivers are created by
          Company Admin only.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sky-900">
        <Info className="mt-0.5 h-5 w-5 shrink-0" />
        <p className="text-sm">
          <span className="font-semibold">View available drivers</span> from your company.
          You cannot add new drivers here — contact your Company Admin to register drivers.
        </p>
      </div>

      {loading ? (
        <p className="py-16 text-center text-slate-400">Loading drivers...</p>
      ) : (
        <>
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Users className="h-5 w-5 text-fleet-500" />
                Available Drivers
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                All drivers created by Company Admin
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">License</th>
                    <th className="px-4 py-3">Assigned To</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDrivers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                        No drivers found.
                      </td>
                    </tr>
                  ) : (
                    filteredDrivers.map((d) => {
                      const assigned = findVehicleForDriver(d._id, vehicles);
                      return (
                        <tr key={d._id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {d.fullName}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{d.phone}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {d.licenseNumber ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {assigned ? assigned.registrationNumber : (
                              <span className="text-emerald-600">Available</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                title="View driver details"
                                onClick={() => setDetailDriver(d)}
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-fleet-600"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Assign to vehicle"
                                onClick={() => openAssign(d._id)}
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-fleet-600"
                              >
                                <Link2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">My Vehicle Assignments</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Change or unassign drivers on your vehicles
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Registration</th>
                    <th className="px-4 py-3">Current Driver</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                        No vehicles found.
                      </td>
                    </tr>
                  ) : (
                    filteredVehicles.map((v) => {
                      const assigned = driverName(v.assignedDriverId);
                      return (
                        <tr key={v._id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-3 text-slate-700">
                            {[v.make, v.modelName].filter(Boolean).join(' ') || '—'}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {v.registrationNumber}
                          </td>
                          <td className="px-4 py-3">
                            {assigned ? (
                              <span className="font-medium text-slate-800">{assigned}</span>
                            ) : (
                              <span className="text-slate-400">No driver</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              {assigned ? (
                                <>
                                  <button
                                    type="button"
                                    title="Change driver"
                                    onClick={() => openChange(v)}
                                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-fleet-600 hover:bg-fleet-50"
                                  >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    Change
                                  </button>
                                  <button
                                    type="button"
                                    title="Unassign driver"
                                    disabled={busyVehicleId === v._id}
                                    onClick={() => handleUnassign(v)}
                                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                                  >
                                    <UserMinus className="h-3.5 w-3.5" />
                                    Unassign
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openAssign(undefined, v._id)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-fleet-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-fleet-600"
                                >
                                  <Link2 className="h-3.5 w-3.5" />
                                  Assign Driver
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <OwnerDriverDetailModal
        driver={detailDriver}
        vehicles={vehicles}
        onClose={() => setDetailDriver(null)}
      />

      <OwnerAssignDriverModal
        open={assignOpen}
        mode={assignMode}
        drivers={drivers}
        vehicles={vehicles}
        initialDriverId={assignDriverId}
        initialVehicleId={assignVehicleId}
        onClose={() => {
          setAssignOpen(false);
          setAssignDriverId(undefined);
          setAssignVehicleId(undefined);
        }}
        onSuccess={() => load()}
      />
    </div>
  );
}


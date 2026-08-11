/** Canonical fuel types for vehicle registration */
export const VEHICLE_FUEL_TYPE_OPTIONS = [
  'Petrol',
  'Diesel',
  'CNG',
  'CNG + Petrol',
  'Diesel + CNG',
  'Electric',
] as const;

export type VehicleFuelTypeOption = (typeof VEHICLE_FUEL_TYPE_OPTIONS)[number];

export function normalizeFuelTypeLabel(fuelType?: string | null): string {
  return (fuelType ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Dual-fuel vehicles can be filled with either listed fuel for an expense */
export function getDualFuelFillOptions(
  vehicleFuelType?: string | null,
): string[] | null {
  const n = normalizeFuelTypeLabel(vehicleFuelType);
  if (n === 'cng + petrol' || n === 'petrol + cng') return ['Petrol', 'CNG'];
  if (n === 'diesel + cng' || n === 'cng + diesel') return ['Diesel', 'CNG'];
  return null;
}

export function isDualFuelType(vehicleFuelType?: string | null): boolean {
  return getDualFuelFillOptions(vehicleFuelType) != null;
}

/**
 * For expense forms: dual-fuel vehicles use the selected fill type
 * (Petrol / Diesel / CNG); single-fuel vehicles use the vehicle type as-is.
 */
export function resolveExpenseFuelType(
  vehicleFuelType?: string | null,
  filledFuelType?: string | null,
): string | null | undefined {
  const options = getDualFuelFillOptions(vehicleFuelType);
  if (!options) return vehicleFuelType;
  const filled = (filledFuelType ?? '').trim();
  const match = options.find((o) => o.toLowerCase() === filled.toLowerCase());
  return match ?? options[0];
}

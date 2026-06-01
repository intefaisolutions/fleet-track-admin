import { getData } from './api';

export interface VehicleRecord {
  _id: string;
  registrationNumber: string;
  make: string;
  modelName: string;
  vehicleType?: string;
  fuelType?: string;
  status: string;
  currentOdometerKm?: number;
  lastServiceDate?: string;
  insuranceExpiry?: string;
  pucExpiry?: string;
  ownerId?: { _id: string; fullName?: string; email?: string } | string;
  assignedDriverId?: { _id: string; fullName?: string; phone?: string } | string;
}

export const vehiclesService = {
  list: () => getData<VehicleRecord[]>('/vehicles'),
  getById: (id: string) => getData<VehicleRecord>(`/vehicles/${id}`),
};

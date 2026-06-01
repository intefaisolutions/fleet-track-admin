import { getData, postData } from './api';

export interface VehicleRecord {
  _id: string;
  registrationNumber: string;
  make: string;
  modelName: string;
  vehicleType?: string;
  fuelType?: string;
  status: string;
  currentOdometerKm?: number;
  year?: number;
  purchaseDate?: string;
  purchaseCost?: number;
  imageUrl?: string;
  lastServiceDate?: string;
  insuranceExpiry?: string;
  pucExpiry?: string;
  ownerId?: { _id: string; fullName?: string; email?: string } | string;
  assignedDriverId?: { _id: string; fullName?: string; phone?: string } | string;
}

export interface CreateVehiclePayload {
  registrationNumber: string;
  modelName: string;
  make?: string;
  type?: string;
  fuelType?: string;
  year?: number;
  currentOdometerKm?: number;
  purchaseDate?: string;
  purchaseCost?: number;
  imageUrl?: string;
  assignedDriverId?: string;
  status?: string;
  companyId?: string;
}

export const vehiclesService = {
  list: () => getData<VehicleRecord[]>('/vehicles'),
  getById: (id: string) => getData<VehicleRecord>(`/vehicles/${id}`),
  create: (data: CreateVehiclePayload) => postData<VehicleRecord>('/vehicles', data),
};

import { deleteData, getData, patchData, postData } from './api';

export interface ExpenseRecord {
  _id: string;
  vehicleId?: {
    _id: string;
    registrationNumber?: string;
    make?: string;
    modelName?: string;
    ownerId?: { _id: string; fullName?: string } | string;
  } | string;
  recordedBy?: { _id: string; fullName?: string; role?: string } | string;
  category: string;
  amount: number;
  description?: string;
  expenseDate?: string;
  receiptUrl?: string;
  categoryDetails?: Record<string, unknown>;
  odometerKm?: number;
  createdAt?: string;
}

export interface CreateExpensePayload {
  vehicleId: string;
  category: string;
  amount: number;
  description?: string;
  expenseDate?: string;
  receiptUrl?: string;
  categoryDetails?: Record<string, unknown>;
  odometerKm?: number;
}

export const expensesService = {
  list: () => getData<ExpenseRecord[]>('/expenses'),
  create: (data: CreateExpensePayload) => postData('/expenses', data),
  update: (id: string, data: Partial<CreateExpensePayload> & { id?: string; _id?: string }) => {
    const { id: _idField, _id, ...body } = data;
    return patchData(`/expenses/${id}`, body);
  },
  remove: (id: string) => deleteData(`/expenses/${id}`),
};

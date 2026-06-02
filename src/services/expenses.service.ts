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
  createdAt?: string;
}

export interface CreateExpensePayload {
  vehicleId: string;
  category: string;
  amount: number;
  description?: string;
  expenseDate?: string;
}

export const expensesService = {
  list: () => getData<ExpenseRecord[]>('/expenses'),
  create: (data: CreateExpensePayload) => postData('/expenses', data),
  update: (id: string, data: Partial<CreateExpensePayload>) =>
    patchData(`/expenses/${id}`, data),
  remove: (id: string) => deleteData(`/expenses/${id}`),
};

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowLeft, Save } from 'lucide-react';
import { ExpenseFormBody } from '../../components/expenses/ExpenseFormBody';
import {
  EXPENSE_CATEGORY_COUNT,
  computeExpenseAmount,
  emptyCategoryDetails,
  sanitizeCategoryDetails,
  validateExpenseForm,
  type CategoryDetails,
  type ExpenseCategoryCode,
} from '../../config/expenseCategories';
import { ROUTES } from '../../config/constants';
import { expensesService, type CreateExpensePayload } from '../../services/expenses.service';
import { vehiclesService, type VehicleRecord } from '../../services/vehicles.service';
import { getApiErrorMessage } from '../../utils/validation';

export function OwnerAddExpensePage() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [category, setCategory] = useState<ExpenseCategoryCode>('FUEL');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [odometerKm, setOdometerKm] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [details, setDetails] = useState<CategoryDetails>(emptyCategoryDetails('FUEL'));
  const [loading, setLoading] = useState(false);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);

  useEffect(() => {
    setVehiclesLoading(true);
    vehiclesService
      .list()
      .then((res) => {
        const list = res.data ?? [];
        setVehicles(list);
        if (list.length === 1 && list[0]?._id) {
          setVehicleId(list[0]._id);
        }
      })
      .catch((err: unknown) => {
        setVehicles([]);
        toast.error(getApiErrorMessage(err, 'Failed to load vehicles'));
      })
      .finally(() => setVehiclesLoading(false));
  }, []);

  const finalAmount = useMemo(
    () => computeExpenseAmount(category, details, amount),
    [category, details, amount],
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const validationError = validateExpenseForm({
      category,
      vehicleId,
      expenseDate,
      amount: finalAmount,
      odometerKm,
      details,
    });
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const payload: CreateExpensePayload = {
      vehicleId,
      category,
      amount: finalAmount,
      expenseDate,
      receiptUrl: receiptUrl || undefined,
      odometerKm: odometerKm ? Number(odometerKm) : undefined,
      categoryDetails: sanitizeCategoryDetails(category, details),
      description:
        category === 'OTHER'
          ? details.notes?.trim()
          : details.serviceNotes?.trim() || details.repairNotes?.trim() || undefined,
    };

    setLoading(true);
    try {
      await expensesService.create(payload);
      toast.success('Expense added successfully');
      navigate(ROUTES.OWNER_EXPENSES);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to add expense'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add Expense</h1>
          <p className="mt-1 text-sm text-slate-500">
            {EXPENSE_CATEGORY_COUNT} categories — fields match SRS Section 8 (Fuel, Service, Toll,
            Repair, Insurance, PUC, Challan).
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(ROUTES.OWNER_EXPENSES)}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <ExpenseFormBody
          vehicles={vehicles}
          category={category}
          setCategory={setCategory}
          vehicleId={vehicleId}
          setVehicleId={setVehicleId}
          expenseDate={expenseDate}
          setExpenseDate={setExpenseDate}
          amount={amount}
          setAmount={setAmount}
          odometerKm={odometerKm}
          setOdometerKm={setOdometerKm}
          details={details}
          setDetails={setDetails}
          receiptUrl={receiptUrl}
          setReceiptUrl={setReceiptUrl}
          vehiclesLoading={vehiclesLoading}
        />

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-fleet-500 py-3 text-sm font-semibold text-white hover:bg-fleet-600 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {loading ? 'Saving...' : 'Save Expense'}
        </button>
      </form>
    </div>
  );
}

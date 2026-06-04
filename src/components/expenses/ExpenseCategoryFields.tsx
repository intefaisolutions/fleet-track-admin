import {
  EXPENSE_CATEGORY_FIELDS,
  normalizeExpenseCategory,
  type CategoryDetails,
  type ExpenseCategoryCode,
} from '../../config/expenseCategories';

export function ExpenseCategoryFields({
  category,
  details,
  setDetails,
}: {
  category: string;
  details: CategoryDetails;
  setDetails: (next: CategoryDetails) => void;
}) {
  const code = normalizeExpenseCategory(category);
  const fields = EXPENSE_CATEGORY_FIELDS[code as ExpenseCategoryCode];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.key} className={fields.length === 1 ? 'sm:col-span-2' : undefined}>
          <label className="mb-1 block text-xs font-semibold text-slate-600">{field.label}</label>
          <input
            type={field.type ?? 'text'}
            value={details[field.key] ?? ''}
            placeholder={field.placeholder}
            onChange={(e) => setDetails({ ...details, [field.key]: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
          />
        </div>
      ))}
    </div>
  );
}

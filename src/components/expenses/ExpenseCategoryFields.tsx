import {
  EXPENSE_CATEGORY_META,
  normalizeExpenseCategory,
  type CategoryDetails,
  type ExpenseCategoryCode,
} from '../../config/expenseCategories';

const inputClass =
  'w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20';

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
  const fields = EXPENSE_CATEGORY_META[code as ExpenseCategoryCode].detailFields;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => {
        const label = (
          <>
            {field.label}
            {field.required ? ' *' : ''}
          </>
        );

        if (field.type === 'select' && field.options) {
          return (
            <div key={field.key} className={field.fullWidth ? 'sm:col-span-2' : undefined}>
              <label className="mb-1 block text-xs font-semibold text-slate-600">{label}</label>
              <select
                required={field.required}
                value={details[field.key] ?? ''}
                onChange={(e) => setDetails({ ...details, [field.key]: e.target.value })}
                className={inputClass}
              >
                <option value="">Select…</option>
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        if (field.type === 'textarea') {
          return (
            <div key={field.key} className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600">{label}</label>
              <textarea
                rows={3}
                required={field.required}
                value={details[field.key] ?? ''}
                placeholder={field.placeholder}
                onChange={(e) => setDetails({ ...details, [field.key]: e.target.value })}
                className={inputClass}
              />
            </div>
          );
        }

        return (
          <div key={field.key} className={field.fullWidth ? 'sm:col-span-2' : undefined}>
            <label className="mb-1 block text-xs font-semibold text-slate-600">{label}</label>
            <input
              type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
              step={field.type === 'number' ? 'any' : undefined}
              min={field.type === 'number' ? 0 : undefined}
              required={field.required}
              value={details[field.key] ?? ''}
              placeholder={field.placeholder}
              onChange={(e) => setDetails({ ...details, [field.key]: e.target.value })}
              className={inputClass}
            />
          </div>
        );
      })}
    </div>
  );
}

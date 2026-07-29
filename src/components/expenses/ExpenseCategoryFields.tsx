import {
  getCategoryDetailFields,
  normalizeExpenseCategory,
  type CategoryDetails,
} from '../../config/expenseCategories';

const inputClass =
  'w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20';

const DECIMAL_FIELD_KEYS = new Set([
  'pricePerLitre',
  'litres',
  'energyNeeded',
  'electricityRate',
  'chargingEfficiency',
]);

export function ExpenseCategoryFields({
  category,
  details,
  setDetails,
  fuelType,
}: {
  category: string;
  details: CategoryDetails;
  setDetails: (next: CategoryDetails) => void;
  /** Selected vehicle fuel type — drives Fuel vs Electric fields */
  fuelType?: string | null;
}) {
  const code = normalizeExpenseCategory(category);
  const fields = getCategoryDetailFields(code, fuelType);

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
              step={
                field.type === 'number'
                  ? DECIMAL_FIELD_KEYS.has(field.key)
                    ? '0.01'
                    : 'any'
                  : undefined
              }
              min={field.type === 'number' ? 0 : undefined}
              required={field.required}
              value={details[field.key] ?? ''}
              placeholder={field.placeholder}
              onChange={(e) => setDetails({ ...details, [field.key]: e.target.value })}
              className={inputClass}
            />
            {field.key === 'chargingEfficiency' ? (
              <p className="mt-1 text-[11px] text-slate-400">
                Factor (0.95) or percent (95). Used as Energy × Rate × Efficiency.
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

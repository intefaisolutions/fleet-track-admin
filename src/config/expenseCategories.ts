/**
 * SRS Section 8 — seven expense categories (fixed order, labels, and per-category fields).
 */
export const EXPENSE_CATEGORY_ORDER = [
  'FUEL',
  'SERVICE',
  'INSURANCE',
  'PUC',
  'TOLL',
  'CHALLAN',
  'OTHER',
] as const;

export type ExpenseCategoryCode = (typeof EXPENSE_CATEGORY_ORDER)[number];

export const EXPENSE_CATEGORY_COUNT = EXPENSE_CATEGORY_ORDER.length;

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategoryCode, string> = {
  FUEL: 'Fuel',
  SERVICE: 'Service',
  INSURANCE: 'Insurance',
  PUC: 'PUC',
  TOLL: 'Toll',
  CHALLAN: 'Challan',
  OTHER: 'Other',
};

export const EXPENSE_CATEGORY_STYLES: Record<ExpenseCategoryCode, string> = {
  FUEL: 'bg-sky-100 text-sky-800',
  SERVICE: 'bg-orange-100 text-orange-800',
  INSURANCE: 'bg-emerald-100 text-emerald-800',
  PUC: 'bg-teal-100 text-teal-800',
  TOLL: 'bg-purple-100 text-purple-800',
  CHALLAN: 'bg-red-100 text-red-800',
  OTHER: 'bg-slate-100 text-slate-700',
};

export type CategoryFieldDef = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date';
  placeholder?: string;
};

export const EXPENSE_CATEGORY_FIELDS: Record<ExpenseCategoryCode, CategoryFieldDef[]> = {
  FUEL: [
    { key: 'stationName', label: 'Fuel Station', placeholder: 'Indian Oil' },
    { key: 'litres', label: 'Litres', type: 'number', placeholder: '45' },
    { key: 'ratePerLitre', label: 'Rate per Litre (₹)', type: 'number', placeholder: '98' },
    { key: 'paymentMethod', label: 'Payment Method', placeholder: 'Cash / UPI / Card' },
  ],
  SERVICE: [
    { key: 'serviceCenter', label: 'Service Center', placeholder: 'Tata Workshop' },
    { key: 'serviceType', label: 'Service Type', placeholder: 'Oil change / Engine' },
    { key: 'invoiceNumber', label: 'Invoice / Job No.', placeholder: 'INV-1024' },
  ],
  INSURANCE: [
    { key: 'policyNumber', label: 'Policy Number', placeholder: 'POL12345' },
    { key: 'provider', label: 'Insurance Provider', placeholder: 'ICICI Lombard' },
    { key: 'validTill', label: 'Valid Till', type: 'date' },
  ],
  PUC: [
    { key: 'certificateNumber', label: 'PUC Certificate No.', placeholder: 'PUC9988' },
    { key: 'testingCenter', label: 'Testing Center', placeholder: 'RTO PUC Center' },
    { key: 'validTill', label: 'Valid Till', type: 'date' },
  ],
  TOLL: [
    { key: 'tollBooth', label: 'Toll Booth', placeholder: 'Gurgaon Border' },
    { key: 'route', label: 'Route', placeholder: 'Delhi–Jaipur' },
    { key: 'paymentMethod', label: 'Payment Method', placeholder: 'FASTag / Cash' },
  ],
  CHALLAN: [
    { key: 'challanNumber', label: 'Challan Number', placeholder: 'CH123456' },
    { key: 'reason', label: 'Violation Reason', placeholder: 'Over speed' },
    { key: 'location', label: 'Location', placeholder: 'NH-48, Gurgaon' },
  ],
  OTHER: [{ key: 'notes', label: 'Notes', placeholder: 'Describe this expense' }],
};

const LEGACY_CATEGORY_MAP: Record<string, ExpenseCategoryCode> = {
  MAINTENANCE: 'SERVICE',
  REPAIR: 'SERVICE',
};

export function normalizeExpenseCategory(code: string): ExpenseCategoryCode {
  const upper = code?.toUpperCase?.() ?? '';
  if (upper in LEGACY_CATEGORY_MAP) {
    return LEGACY_CATEGORY_MAP[upper];
  }
  if ((EXPENSE_CATEGORY_ORDER as readonly string[]).includes(upper)) {
    return upper as ExpenseCategoryCode;
  }
  return 'OTHER';
}

export function expenseCategoryLabel(code: string): string {
  return EXPENSE_CATEGORY_LABELS[normalizeExpenseCategory(code)];
}

export function expenseCategoryStyle(code: string): string {
  return EXPENSE_CATEGORY_STYLES[normalizeExpenseCategory(code)];
}

export type CategoryDetails = Record<string, string>;

export function emptyCategoryDetails(category: ExpenseCategoryCode): CategoryDetails {
  const fields = EXPENSE_CATEGORY_FIELDS[category];
  return Object.fromEntries(fields.map((f) => [f.key, '']));
}

export function categoryDetailsFromRecord(
  category: string,
  raw?: Record<string, unknown> | null,
): CategoryDetails {
  const code = normalizeExpenseCategory(category);
  const base = emptyCategoryDetails(code);
  if (!raw) return base;
  for (const field of EXPENSE_CATEGORY_FIELDS[code]) {
    const v = raw[field.key];
    if (v != null && v !== '') {
      base[field.key] = String(v);
    }
  }
  return base;
}

export function sanitizeCategoryDetails(
  category: string,
  details: CategoryDetails,
): Record<string, unknown> | undefined {
  const code = normalizeExpenseCategory(category);
  const out: Record<string, unknown> = {};
  for (const field of EXPENSE_CATEGORY_FIELDS[code]) {
    const raw = details[field.key]?.trim?.() ?? '';
    if (!raw) continue;
    if (field.type === 'number') {
      const n = Number(raw);
      if (!Number.isNaN(n)) out[field.key] = n;
    } else {
      out[field.key] = raw;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function formatCategoryDetailsSummary(
  category: string,
  details?: Record<string, unknown> | null,
): string {
  const code = normalizeExpenseCategory(category);
  const parts: string[] = [];
  for (const field of EXPENSE_CATEGORY_FIELDS[code]) {
    const v = details?.[field.key];
    if (v != null && String(v).trim() !== '') {
      parts.push(`${field.label}: ${v}`);
    }
  }
  return parts.join(' · ');
}

export type CategoryStatRow = {
  code: ExpenseCategoryCode;
  label: string;
  count: number;
  amount: number;
};

export function buildCategoryStats(
  expenses: { category: string; amount: number }[],
): CategoryStatRow[] {
  return EXPENSE_CATEGORY_ORDER.map((code) => {
    const rows = expenses.filter((e) => normalizeExpenseCategory(e.category) === code);
    return {
      code,
      label: EXPENSE_CATEGORY_LABELS[code],
      count: rows.length,
      amount: rows.reduce((s, e) => s + Number(e.amount || 0), 0),
    };
  });
}

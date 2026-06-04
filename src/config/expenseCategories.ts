/**
 * SRS Section 8 — expense categories 8.1–8.7 (+ Other).
 */
export const EXPENSE_CATEGORY_ORDER = [
  'FUEL',
  'SERVICE',
  'TOLL',
  'REPAIR',
  'INSURANCE',
  'PUC',
  'CHALLAN',
  'OTHER',
] as const;

export type ExpenseCategoryCode = (typeof EXPENSE_CATEGORY_ORDER)[number];

export const EXPENSE_CATEGORY_COUNT = EXPENSE_CATEGORY_ORDER.length;

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategoryCode, string> = {
  FUEL: 'Fuel',
  SERVICE: 'Service / Maintenance',
  TOLL: 'Toll / FASTag',
  REPAIR: 'Repair',
  INSURANCE: 'Insurance',
  PUC: 'PUC / Pollution',
  CHALLAN: 'Challan / Fine',
  OTHER: 'Other',
};

export const EXPENSE_CATEGORY_STYLES: Record<ExpenseCategoryCode, string> = {
  FUEL: 'bg-sky-100 text-sky-800',
  SERVICE: 'bg-orange-100 text-orange-800',
  TOLL: 'bg-purple-100 text-purple-800',
  REPAIR: 'bg-amber-100 text-amber-800',
  INSURANCE: 'bg-emerald-100 text-emerald-800',
  PUC: 'bg-teal-100 text-teal-800',
  CHALLAN: 'bg-red-100 text-red-800',
  OTHER: 'bg-slate-100 text-slate-700',
};

export const PAYMENT_METHOD_OPTIONS = ['Cash', 'Card', 'UPI', 'FASTag', 'Fleet Card'] as const;
export const TOLL_PAYMENT_OPTIONS = ['FASTag', 'Cash'] as const;
export const SERVICE_TYPE_OPTIONS = [
  'Oil Change',
  'General Service',
  'Engine',
  'Brake',
  'AC',
] as const;

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'textarea';

export type CategoryFieldDef = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: readonly string[];
  fullWidth?: boolean;
};

export type AmountRule =
  | { mode: 'auto'; formula: 'fuel' | 'labourParts' }
  | { mode: 'manual'; label: string };

export type CategoryMeta = {
  srs: string;
  amountRule: AmountRule;
  showOdometer: boolean;
  showReceipt: boolean;
  detailFields: CategoryFieldDef[];
};

export const EXPENSE_CATEGORY_META: Record<ExpenseCategoryCode, CategoryMeta> = {
  FUEL: {
    srs: '8.1',
    amountRule: { mode: 'auto', formula: 'fuel' },
    showOdometer: true,
    showReceipt: true,
    detailFields: [
      { key: 'litres', label: 'Litres Filled', type: 'number', required: true, placeholder: '45.5' },
      { key: 'pricePerLitre', label: 'Price per Litre (₹)', type: 'number', required: true, placeholder: '76.67' },
      { key: 'fuelStationName', label: 'Fuel Station Name', type: 'text', placeholder: 'Indian Oil, NH-48' },
      {
        key: 'paymentMethod',
        label: 'Payment Method',
        type: 'select',
        options: PAYMENT_METHOD_OPTIONS,
      },
    ],
  },
  SERVICE: {
    srs: '8.2',
    amountRule: { mode: 'auto', formula: 'labourParts' },
    showOdometer: true,
    showReceipt: true,
    detailFields: [
      {
        key: 'serviceType',
        label: 'Service Type',
        type: 'select',
        required: true,
        options: SERVICE_TYPE_OPTIONS,
      },
      {
        key: 'mechanicName',
        label: 'Mechanic / Garage Name',
        type: 'text',
        required: true,
        placeholder: 'Sharma Auto Works',
      },
      { key: 'labourCost', label: 'Labour Cost (₹)', type: 'number', required: true, placeholder: '800' },
      { key: 'partsCost', label: 'Parts Cost (₹)', type: 'number', required: true, placeholder: '4200' },
      { key: 'nextServiceDueDate', label: 'Next Service Due (date)', type: 'date', required: true },
      { key: 'nextServiceDueKm', label: 'Or next due (km)', type: 'number', placeholder: '5000' },
      { key: 'serviceNotes', label: 'Service Notes', type: 'textarea', fullWidth: true, placeholder: 'Oil changed, filter cleaned' },
    ],
  },
  TOLL: {
    srs: '8.3',
    amountRule: { mode: 'manual', label: 'Amount (₹)' },
    showOdometer: false,
    showReceipt: true,
    detailFields: [
      {
        key: 'tollPlazaName',
        label: 'Toll Plaza Name',
        type: 'text',
        required: true,
        placeholder: 'Mumbai-Pune Expressway Toll',
      },
      { key: 'tripPurpose', label: 'Trip Purpose', type: 'text', placeholder: 'Goods delivery to Pune' },
      {
        key: 'paymentMethod',
        label: 'Payment Method',
        type: 'select',
        required: true,
        options: TOLL_PAYMENT_OPTIONS,
      },
    ],
  },
  REPAIR: {
    srs: '8.4',
    amountRule: { mode: 'auto', formula: 'labourParts' },
    showOdometer: false,
    showReceipt: true,
    detailFields: [
      { key: 'partReplaced', label: 'Part Replaced', type: 'text', required: true, placeholder: 'Clutch Plate' },
      {
        key: 'mechanicName',
        label: 'Mechanic / Garage Name',
        type: 'text',
        required: true,
        placeholder: 'Sharma Auto Works',
      },
      { key: 'labourCost', label: 'Labour Cost (₹)', type: 'number', required: true, placeholder: '1000' },
      { key: 'partsCost', label: 'Parts Cost (₹)', type: 'number', required: true, placeholder: '2850' },
      { key: 'repairNotes', label: 'Repair Notes', type: 'textarea', fullWidth: true, placeholder: 'Jerking in 1st gear' },
    ],
  },
  INSURANCE: {
    srs: '8.5',
    amountRule: { mode: 'manual', label: 'Premium Amount (₹)' },
    showOdometer: false,
    showReceipt: true,
    detailFields: [
      { key: 'policyNumber', label: 'Policy Number', type: 'text', required: true, placeholder: 'INS202400123' },
      {
        key: 'insuranceCompany',
        label: 'Insurance Company',
        type: 'text',
        required: true,
        placeholder: 'New India Assurance',
      },
      { key: 'policyStartDate', label: 'Policy Start Date', type: 'date', required: true },
      { key: 'policyExpiryDate', label: 'Policy Expiry Date', type: 'date', required: true },
    ],
  },
  PUC: {
    srs: '8.6',
    amountRule: { mode: 'manual', label: 'Cost (₹)' },
    showOdometer: false,
    showReceipt: true,
    detailFields: [
      { key: 'certificateNumber', label: 'Certificate Number', type: 'text', required: true, placeholder: 'PUC20260220001' },
      {
        key: 'testingCentre',
        label: 'Testing Centre',
        type: 'text',
        required: true,
        placeholder: 'RTO Authorized Centre',
      },
      { key: 'expiryDate', label: 'Expiry Date', type: 'date', required: true },
    ],
  },
  CHALLAN: {
    srs: '8.7',
    amountRule: { mode: 'manual', label: 'Fine Amount (₹)' },
    showOdometer: false,
    showReceipt: true,
    detailFields: [
      {
        key: 'violationType',
        label: 'Violation Type',
        type: 'text',
        required: true,
        placeholder: 'Speeding / Wrong Parking',
      },
      { key: 'location', label: 'Location', type: 'text', required: true, placeholder: 'Sector 18, Gurgaon' },
      { key: 'challanNumber', label: 'Challan Number', type: 'text', placeholder: 'CH234567' },
    ],
  },
  OTHER: {
    srs: '—',
    amountRule: { mode: 'manual', label: 'Amount (₹)' },
    showOdometer: false,
    showReceipt: true,
    detailFields: [
      { key: 'notes', label: 'Notes', type: 'textarea', required: true, fullWidth: true, placeholder: 'Describe expense' },
    ],
  },
};

/** Legacy DB keys → SRS keys when loading old expenses */
const DETAIL_ALIASES: Partial<Record<ExpenseCategoryCode, Record<string, string>>> = {
  FUEL: { stationName: 'fuelStationName', ratePerLitre: 'pricePerLitre' },
  SERVICE: { serviceCenter: 'mechanicName', serviceType: 'serviceType' },
  TOLL: { tollBooth: 'tollPlazaName', route: 'tripPurpose' },
  REPAIR: { serviceCenter: 'mechanicName' },
  INSURANCE: { provider: 'insuranceCompany', validTill: 'policyExpiryDate' },
  PUC: { validTill: 'expiryDate' },
  CHALLAN: { reason: 'violationType' },
};

const LEGACY_CATEGORY_MAP: Record<string, ExpenseCategoryCode> = {
  MAINTENANCE: 'SERVICE',
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

export function getCategoryMeta(category: string): CategoryMeta {
  return EXPENSE_CATEGORY_META[normalizeExpenseCategory(category)];
}

export function isAmountAutoCalculated(category: string): boolean {
  return getCategoryMeta(category).amountRule.mode === 'auto';
}

export function amountFieldLabel(category: string): string {
  const rule = getCategoryMeta(category).amountRule;
  if (rule.mode === 'auto') {
    return rule.formula === 'fuel' ? 'Total Amount (₹) — auto' : 'Total Cost (₹) — auto';
  }
  return rule.label;
}

export type CategoryDetails = Record<string, string>;

export function emptyCategoryDetails(category: ExpenseCategoryCode): CategoryDetails {
  const fields = EXPENSE_CATEGORY_META[category].detailFields;
  return Object.fromEntries(fields.map((f) => [f.key, '']));
}

export function categoryDetailsFromRecord(
  category: string,
  raw?: Record<string, unknown> | null,
): CategoryDetails {
  const code = normalizeExpenseCategory(category);
  const base = emptyCategoryDetails(code);
  if (!raw) return base;

  const aliases = DETAIL_ALIASES[code] ?? {};
  for (const [legacyKey, canonicalKey] of Object.entries(aliases)) {
    if (raw[legacyKey] != null && raw[legacyKey] !== '' && !raw[canonicalKey]) {
      base[canonicalKey] = String(raw[legacyKey]);
    }
  }

  for (const field of EXPENSE_CATEGORY_META[code].detailFields) {
    const v = raw[field.key];
    if (v != null && v !== '') {
      base[field.key] = String(v);
    }
  }
  return base;
}

export function computeExpenseAmount(
  category: string,
  details: CategoryDetails,
  manualAmount?: string,
): number {
  const code = normalizeExpenseCategory(category);
  const rule = EXPENSE_CATEGORY_META[code].amountRule;
  if (rule.mode === 'manual') {
    return Number(manualAmount || 0);
  }
  if (rule.formula === 'fuel') {
    const litres = Number(details.litres || 0);
    const rate = Number(details.pricePerLitre || details.ratePerLitre || 0);
    if (litres > 0 && rate > 0) return Math.round(litres * rate * 100) / 100;
    return Number(manualAmount || 0);
  }
  const labour = Number(details.labourCost || 0);
  const parts = Number(details.partsCost || 0);
  if (labour > 0 || parts > 0) return labour + parts;
  return Number(manualAmount || 0);
}

export function sanitizeCategoryDetails(
  category: string,
  details: CategoryDetails,
): Record<string, unknown> | undefined {
  const code = normalizeExpenseCategory(category);
  const out: Record<string, unknown> = {};
  for (const field of EXPENSE_CATEGORY_META[code].detailFields) {
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

export function validateExpenseForm(input: {
  category: string;
  vehicleId: string;
  expenseDate: string;
  amount: number;
  odometerKm?: string;
  details: CategoryDetails;
}): string | null {
  const code = normalizeExpenseCategory(input.category);
  const meta = EXPENSE_CATEGORY_META[code];

  if (!input.vehicleId) return 'Please select a vehicle';
  if (!input.expenseDate) return 'Please select a date';
  if (!input.amount || input.amount <= 0) return 'Please enter a valid amount';

  if (meta.showOdometer && !input.odometerKm?.trim()) {
    return 'Odometer reading is required';
  }

  for (const field of meta.detailFields) {
    if (!field.required) continue;
    const v = input.details[field.key]?.trim?.() ?? '';
    if (!v) return `${field.label} is required`;
  }

  return null;
}

export function formatCategoryDetailsSummary(
  category: string,
  details?: Record<string, unknown> | null,
): string {
  const code = normalizeExpenseCategory(category);
  const mapped = categoryDetailsFromRecord(code, details);
  const parts: string[] = [];
  for (const field of EXPENSE_CATEGORY_META[code].detailFields) {
    const v = mapped[field.key];
    if (v) parts.push(`${field.label}: ${v}`);
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

/** @deprecated use EXPENSE_CATEGORY_META */
export const EXPENSE_CATEGORY_FIELDS = Object.fromEntries(
  EXPENSE_CATEGORY_ORDER.map((c) => [c, EXPENSE_CATEGORY_META[c].detailFields]),
) as Record<ExpenseCategoryCode, CategoryFieldDef[]>;

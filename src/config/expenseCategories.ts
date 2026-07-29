/**
 * SRS Section 8 — expense categories 8.1–8.7 (+ Other).
 */
import { formatGroupedNumber } from '../utils/currency';

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

/** Petrol / Diesel fuel expense fields (liquid — litres) */
export const FUEL_ICE_DETAIL_FIELDS: CategoryFieldDef[] = [
  {
    key: 'pricePerLitre',
    label: 'Cost Per Litre (₹)',
    type: 'number',
    required: true,
    placeholder: '76.67',
  },
  {
    key: 'litres',
    label: 'Total Litres',
    type: 'number',
    required: true,
    placeholder: '45.5',
  },
  {
    key: 'fuelStationName',
    label: 'Fuel Station Name',
    type: 'text',
    placeholder: 'Indian Oil, NH-48',
  },
  {
    key: 'paymentMethod',
    label: 'Payment Method',
    type: 'select',
    options: PAYMENT_METHOD_OPTIONS,
  },
];

/** CNG is sold by weight (kg), not litres — same storage keys for compatibility */
export const FUEL_CNG_DETAIL_FIELDS: CategoryFieldDef[] = [
  {
    key: 'pricePerLitre',
    label: 'Cost Per Kg (₹)',
    type: 'number',
    required: true,
    placeholder: '76.67',
  },
  {
    key: 'litres',
    label: 'Total Kg',
    type: 'number',
    required: true,
    placeholder: '8.5',
  },
  {
    key: 'fuelStationName',
    label: 'CNG Station Name',
    type: 'text',
    placeholder: 'IGL CNG Station',
  },
  {
    key: 'paymentMethod',
    label: 'Payment Method',
    type: 'select',
    options: PAYMENT_METHOD_OPTIONS,
  },
];

/** Electric vehicle charging expense fields */
export const FUEL_ELECTRIC_DETAIL_FIELDS: CategoryFieldDef[] = [
  {
    key: 'energyNeeded',
    label: 'Energy Needed (kWh)',
    type: 'number',
    required: true,
    placeholder: '32.5',
  },
  {
    key: 'electricityRate',
    label: 'Electricity Rate (₹/kWh)',
    type: 'number',
    required: true,
    placeholder: '8.50',
  },
  {
    key: 'chargingEfficiency',
    label: 'Charging Efficiency',
    type: 'number',
    required: true,
    placeholder: '0.95',
  },
  {
    key: 'chargingStationName',
    label: 'Charging Station Name',
    type: 'text',
    placeholder: 'Tata Power EZ Charge',
  },
  {
    key: 'paymentMethod',
    label: 'Payment Method',
    type: 'select',
    options: PAYMENT_METHOD_OPTIONS,
  },
];

export function isElectricFuelType(fuelType?: string | null): boolean {
  return (fuelType ?? '').trim().toLowerCase() === 'electric';
}

export function isCngFuelType(fuelType?: string | null): boolean {
  return (fuelType ?? '').trim().toLowerCase() === 'cng';
}

/** Unit labels for petrol/diesel (L) vs CNG (kg) fuel forms */
export function getFuelQuantityUnit(fuelType?: string | null): {
  short: string;
  rateLabel: string;
  quantityLabel: string;
  formula: string;
  stationHint: string;
} {
  if (isCngFuelType(fuelType)) {
    return {
      short: 'kg',
      rateLabel: 'Cost Per Kg',
      quantityLabel: 'Total Kg',
      formula: 'Cost Per Kg × Total Kg',
      stationHint: 'CNG',
    };
  }
  return {
    short: 'L',
    rateLabel: 'Cost Per Litre',
    quantityLabel: 'Total Litres',
    formula: 'Cost Per Litre × Total Litres',
    stationHint: 'petrol/diesel',
  };
}

export function getFuelDetailFields(fuelType?: string | null): CategoryFieldDef[] {
  if (isElectricFuelType(fuelType)) return FUEL_ELECTRIC_DETAIL_FIELDS;
  if (isCngFuelType(fuelType)) return FUEL_CNG_DETAIL_FIELDS;
  return FUEL_ICE_DETAIL_FIELDS;
}

export const EXPENSE_CATEGORY_META: Record<ExpenseCategoryCode, CategoryMeta> = {
  FUEL: {
    srs: '8.1',
    amountRule: { mode: 'auto', formula: 'fuel' },
    showOdometer: true,
    showReceipt: true,
    // Default ICE fields; EV fields resolved via getFuelDetailFields(fuelType)
    detailFields: FUEL_ICE_DETAIL_FIELDS,
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

export function getCategoryDetailFields(
  category: string,
  fuelType?: string | null,
): CategoryFieldDef[] {
  const code = normalizeExpenseCategory(category);
  if (code === 'FUEL') {
    return getFuelDetailFields(fuelType);
  }
  return EXPENSE_CATEGORY_META[code].detailFields;
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

export function amountFieldLabel(
  category: string,
  fuelType?: string | null,
): string {
  const rule = getCategoryMeta(category).amountRule;
  if (rule.mode === 'auto') {
    if (rule.formula === 'fuel') {
      return isElectricFuelType(fuelType)
        ? 'Total Cost (₹)'
        : 'Total Amount (₹)';
    }
    return 'Total Cost (₹) — auto';
  }
  return rule.label;
}

export type CategoryDetails = Record<string, string>;

/** True when saved details look like an EV charging expense */
export function hasElectricExpenseDetails(
  details?: CategoryDetails | null,
): boolean {
  if (!details) return false;
  return Boolean(
    details.energyNeeded?.trim?.() ||
      details.electricityRate?.trim?.() ||
      details.chargingEfficiency?.trim?.(),
  );
}

/** Parse a decimal input; empty / invalid → null. Accepts Indian grouping commas. */
export function parseDecimalInput(raw?: string): number | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/,/g, '');
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return n;
}

/**
 * Fuel (petrol/diesel/CNG): Total Amount = rate × quantity
 * (CNG uses kg; petrol/diesel use litres — same detail keys)
 */
export function computeFuelTotalAmount(details: CategoryDetails): number {
  const costPerLitre = parseDecimalInput(
    details.pricePerLitre || details.ratePerLitre,
  );
  const totalLitres = parseDecimalInput(details.litres);
  if (
    costPerLitre == null ||
    totalLitres == null ||
    costPerLitre <= 0 ||
    totalLitres <= 0
  ) {
    return 0;
  }
  return Math.round(costPerLitre * totalLitres * 100) / 100;
}

/**
 * Electric: Total Cost = Energy × Electricity Rate × Efficiency
 * Efficiency may be entered as a factor (0.95) or percent (95).
 */
export function computeElectricTotalAmount(details: CategoryDetails): number {
  const energy = parseDecimalInput(details.energyNeeded);
  const rate = parseDecimalInput(details.electricityRate);
  let efficiency = parseDecimalInput(details.chargingEfficiency);
  if (
    energy == null ||
    rate == null ||
    efficiency == null ||
    energy <= 0 ||
    rate <= 0 ||
    efficiency <= 0
  ) {
    return 0;
  }
  // Allow 95 meaning 95% → 0.95
  if (efficiency > 1) {
    efficiency = efficiency / 100;
  }
  return Math.round(energy * rate * efficiency * 100) / 100;
}

export function emptyCategoryDetails(
  category: ExpenseCategoryCode,
  fuelType?: string | null,
): CategoryDetails {
  const fields = getCategoryDetailFields(category, fuelType);
  return Object.fromEntries(fields.map((f) => [f.key, '']));
}

export function categoryDetailsFromRecord(
  category: string,
  raw?: Record<string, unknown> | null,
  fuelType?: string | null,
): CategoryDetails {
  const code = normalizeExpenseCategory(category);
  const inferredElectric =
    isElectricFuelType(fuelType) ||
    (raw != null &&
      (raw.energyNeeded != null ||
        raw.electricityRate != null ||
        raw.chargingEfficiency != null));
  const resolvedFuelType = inferredElectric
    ? 'Electric'
    : fuelType ||
      (typeof raw?.vehicleFuelType === 'string' ? raw.vehicleFuelType : undefined);
  const base = emptyCategoryDetails(code, resolvedFuelType);
  if (!raw) return base;

  const aliases = DETAIL_ALIASES[code] ?? {};
  for (const [legacyKey, canonicalKey] of Object.entries(aliases)) {
    if (raw[legacyKey] != null && raw[legacyKey] !== '' && !raw[canonicalKey]) {
      base[canonicalKey] = String(raw[legacyKey]);
    }
  }

  const fieldDefs =
    code === 'FUEL'
      ? [
          ...FUEL_ICE_DETAIL_FIELDS,
          ...FUEL_CNG_DETAIL_FIELDS,
          ...FUEL_ELECTRIC_DETAIL_FIELDS,
        ]
      : EXPENSE_CATEGORY_META[code].detailFields;

  for (const field of fieldDefs) {
    const v = raw[field.key];
    if (v == null || v === '') continue;
    if (field.type === 'number') {
      base[field.key] = formatGroupedNumber(
        typeof v === 'number' ? v : String(v),
        { allowDecimal: true },
      );
    } else {
      base[field.key] = String(v);
    }
  }
  return base;
}

export function computeExpenseAmount(
  category: string,
  details: CategoryDetails,
  manualAmount?: string,
  fuelType?: string | null,
): number {
  const code = normalizeExpenseCategory(category);
  const rule = EXPENSE_CATEGORY_META[code].amountRule;
  if (rule.mode === 'manual') {
    return parseDecimalInput(manualAmount) ?? 0;
  }
  if (rule.formula === 'fuel') {
    const electric =
      isElectricFuelType(fuelType) || hasElectricExpenseDetails(details);
    return electric
      ? computeElectricTotalAmount(details)
      : computeFuelTotalAmount(details);
  }
  const labour = parseDecimalInput(details.labourCost) ?? 0;
  const parts = parseDecimalInput(details.partsCost) ?? 0;
  if (labour > 0 || parts > 0) return labour + parts;
  return parseDecimalInput(manualAmount) ?? 0;
}

export function sanitizeCategoryDetails(
  category: string,
  details: CategoryDetails,
  fuelType?: string | null,
): Record<string, unknown> | undefined {
  const code = normalizeExpenseCategory(category);
  const fields = getCategoryDetailFields(code, fuelType);
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = details[field.key]?.trim?.() ?? '';
    if (!raw) continue;
    if (field.type === 'number') {
      const n = parseDecimalInput(raw);
      if (n != null) out[field.key] = n;
    } else {
      out[field.key] = raw;
    }
  }
  if (code === 'FUEL' && fuelType) {
    out.vehicleFuelType = fuelType;
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
  fuelType?: string | null;
}): string | null {
  const code = normalizeExpenseCategory(input.category);
  const meta = EXPENSE_CATEGORY_META[code];
  const electric =
    code === 'FUEL' &&
    (isElectricFuelType(input.fuelType) ||
      hasElectricExpenseDetails(input.details));

  if (!input.vehicleId) return 'Please select a vehicle';
  if (!input.expenseDate) return 'Please select a date';

  if (meta.showOdometer && !input.odometerKm?.trim()) {
    return 'Odometer reading is required';
  }

  if (code === 'FUEL' && electric) {
    const energyRaw = input.details.energyNeeded?.trim() ?? '';
    const rateRaw = input.details.electricityRate?.trim() ?? '';
    const effRaw = input.details.chargingEfficiency?.trim() ?? '';

    if (!energyRaw) return 'Energy Needed is required';
    const energy = parseDecimalInput(energyRaw);
    if (energy == null) {
      return 'Energy Needed must be a valid number (decimals allowed).';
    }
    if (energy <= 0) return 'Energy Needed must be greater than zero.';

    if (!rateRaw) return 'Electricity Rate is required';
    const rate = parseDecimalInput(rateRaw);
    if (rate == null) {
      return 'Electricity Rate must be a valid number (decimals allowed).';
    }
    if (rate <= 0) return 'Electricity Rate must be greater than zero.';

    if (!effRaw) return 'Charging Efficiency is required';
    const efficiency = parseDecimalInput(effRaw);
    if (efficiency == null) {
      return 'Charging Efficiency must be a valid number (e.g. 0.95 or 95).';
    }
    if (efficiency <= 0) {
      return 'Charging Efficiency must be greater than zero.';
    }

    if (computeElectricTotalAmount(input.details) <= 0) {
      return 'Total Cost could not be calculated. Check Energy, Rate, and Efficiency.';
    }
  } else if (code === 'FUEL') {
    const unit = getFuelQuantityUnit(input.fuelType);
    const costRaw = input.details.pricePerLitre?.trim() ?? '';
    const qtyRaw = input.details.litres?.trim() ?? '';

    if (!costRaw) return `${unit.rateLabel} is required`;
    const cost = parseDecimalInput(costRaw);
    if (cost == null) {
      return `${unit.rateLabel} must be a valid number (decimals allowed).`;
    }
    if (cost <= 0) {
      return `${unit.rateLabel} must be greater than zero.`;
    }

    if (!qtyRaw) return `${unit.quantityLabel} is required`;
    const qty = parseDecimalInput(qtyRaw);
    if (qty == null) {
      return `${unit.quantityLabel} must be a valid number (decimals allowed).`;
    }
    if (qty <= 0) {
      return `${unit.quantityLabel} must be greater than zero.`;
    }

    if (computeFuelTotalAmount(input.details) <= 0) {
      return `Total Amount could not be calculated. Check ${unit.rateLabel} and ${unit.quantityLabel}.`;
    }
  } else {
    for (const field of meta.detailFields) {
      if (!field.required) continue;
      const v = input.details[field.key]?.trim?.() ?? '';
      if (!v) return `${field.label} is required`;
      if (field.type === 'number') {
        const n = parseDecimalInput(v);
        if (n == null) return `${field.label} must be a valid number`;
        if (n < 0) return `${field.label} cannot be negative`;
      }
    }
  }

  if (!input.amount || input.amount <= 0) {
    if (code === 'FUEL' && electric) {
      return 'Total Cost is calculated automatically from Energy × Electricity Rate × Efficiency.';
    }
    return code === 'FUEL'
      ? `Total Amount is calculated automatically from ${getFuelQuantityUnit(input.fuelType).formula}.`
      : 'Please enter a valid amount';
  }

  return null;
}

export function formatCategoryDetailsSummary(
  category: string,
  details?: Record<string, unknown> | null,
): string {
  const code = normalizeExpenseCategory(category);
  const mapped = categoryDetailsFromRecord(code, details);
  const electric = hasElectricExpenseDetails(mapped);
  const fields =
    code === 'FUEL'
      ? getFuelDetailFields(electric ? 'Electric' : undefined)
      : EXPENSE_CATEGORY_META[code].detailFields;
  const parts: string[] = [];
  for (const field of fields) {
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

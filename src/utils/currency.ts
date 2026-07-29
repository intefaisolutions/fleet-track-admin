/**
 * Indian Rupee / number formatting helpers (en-IN grouping).
 * Examples: 45500 → 45,500 ; 850000 → 8,50,000
 */

export function parseGroupedNumber(
  value: string,
  options?: { allowDecimal?: boolean },
): string {
  if (!options?.allowDecimal) {
    return value.replace(/\D/g, '');
  }
  const cleaned = value.replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) return cleaned;
  const intPart = cleaned.slice(0, firstDot).replace(/\./g, '');
  const decPart = cleaned
    .slice(firstDot + 1)
    .replace(/\./g, '')
    .slice(0, 2);
  return decPart.length > 0 ? `${intPart}.${decPart}` : `${intPart}.`;
}

/** Format for inputs while typing (keeps trailing decimal while editing). */
export function formatGroupedNumber(
  value: string | number | null | undefined,
  options?: { allowDecimal?: boolean; maxFractionDigits?: number },
): string {
  const allowDecimal = options?.allowDecimal ?? false;
  const maxFrac = options?.maxFractionDigits ?? 2;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '';
    if (allowDecimal) {
      return value.toLocaleString('en-IN', {
        maximumFractionDigits: maxFrac,
        minimumFractionDigits: 0,
      });
    }
    return Math.trunc(value).toLocaleString('en-IN');
  }

  const raw = String(value ?? '');
  if (!raw.trim()) return '';

  if (!allowDecimal) {
    const digits = parseGroupedNumber(raw, { allowDecimal: false });
    if (!digits) return '';
    return Number(digits).toLocaleString('en-IN');
  }

  const normalized = parseGroupedNumber(raw, { allowDecimal: true });
  if (!normalized || normalized === '.') {
    return normalized === '.' ? '0.' : '';
  }
  const endsWithDot = normalized.endsWith('.');
  const [intRaw, decRaw = ''] = normalized.split('.');
  const intFormatted = intRaw ? Number(intRaw).toLocaleString('en-IN') : '0';
  if (endsWithDot && !decRaw) return `${intFormatted}.`;
  if (decRaw) return `${intFormatted}.${decRaw.slice(0, maxFrac)}`;
  return intFormatted;
}

export function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = parseGroupedNumber(String(value ?? ''), { allowDecimal: true });
  if (!normalized || normalized === '.') return 0;
  const n = Number(normalized.endsWith('.') ? normalized.slice(0, -1) : normalized);
  return Number.isFinite(n) ? n : 0;
}

export function formatInr(
  amount: number,
  options?: { fractionDigits?: number; compact?: boolean },
): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '₹0';

  if (options?.compact) {
    const abs = Math.abs(n);
    if (abs >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (abs >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  }

  const digits = options?.fractionDigits;
  return `₹${n.toLocaleString('en-IN', {
    minimumFractionDigits: digits ?? 0,
    maximumFractionDigits: digits ?? 2,
  })}`;
}

/** Compact KPI style (L / k) — still Indian-aware for full amounts under 1k. */
export function formatInrShort(amount: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '₹0';
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return formatInr(n, { fractionDigits: 0 });
}

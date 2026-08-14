import ExcelJS from 'exceljs';
import { formatInrForExcel } from './currency';

const BRAND = '00AEEF';
const BRAND_DARK = '0078B3';
const HEADER_BG = '0F172A';
const TABLE_HEADER_BG = 'E0F2FE';
const ALT_ROW = 'F8FAFC';
const BORDER = 'CBD5E1';
const MUTED = '64748B';

export type ExcelColumn = {
  header: string;
  key: string;
  width?: number;
  /** Format cell as Indian rupee amount (Rs. — Excel-safe on Windows) */
  amount?: boolean;
  /** Date/time column — no wrap, wider cell */
  date?: boolean;
  /** Allow text wrap (e.g. long descriptions) */
  wrap?: boolean;
};

export type StyledExcelExportInput = {
  /** Parent / company name (shown prominently in the file) */
  companyName: string;
  /** Report title e.g. "Drivers Export" */
  title: string;
  sheetName?: string;
  filename: string;
  columns: ExcelColumn[];
  rows: Record<string, string | number | null | undefined>[];
  exportedBy?: string;
  /** Extra meta lines under the header */
  meta?: { label: string; value: string }[];
};

function thinBorder(): Partial<ExcelJS.Borders> {
  const edge: Partial<ExcelJS.Border> = {
    style: 'thin',
    color: { argb: `FF${BORDER}` },
  };
  return { top: edge, left: edge, bottom: edge, right: edge };
}

/** ₹ often shows as □ / ?? in Excel on Windows — use ASCII-friendly "Rs." */
function excelSafeText(value: string): string {
  return value.replace(/\u20B9/g, 'Rs.');
}

function autoWidth(header: string, values: string[], min = 12, max = 42) {
  const longest = Math.max(header.length, ...values.map((v) => v.length), min);
  return Math.min(longest + 2, max);
}

/**
 * Download a user-friendly styled .xlsx with company name branding.
 * Used by Company Admin / Sub-Admin exports (parent company name always shown).
 */
export async function downloadStyledExcel(
  input: StyledExcelExportInput,
): Promise<void> {
  const {
    companyName,
    title,
    sheetName = 'Export',
    filename,
    columns,
    rows,
    exportedBy,
    meta = [],
  } = input;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'FleetTrack';
  wb.created = new Date();

  const ws = wb.addWorksheet(sheetName.slice(0, 31), {
    views: [{ showGridLines: false }],
    properties: { defaultRowHeight: 18 },
  });

  const colCount = Math.max(columns.length, 2);

  ws.columns = columns.map((c) => {
    const isDate =
      c.date ||
      /^date$/i.test(c.header) ||
      /^date$/i.test(c.key);
    const isAmount = !!c.amount;
    const defaultWidth = isDate ? 22 : isAmount ? 16 : undefined;
    return {
      key: c.key,
      width:
        c.width ??
        defaultWidth ??
        autoWidth(
          c.header,
          rows.map((r) => String(r[c.key] ?? '')),
        ),
    };
  });

  let r = 1;

  // Brand banner
  ws.mergeCells(r, 1, r, colCount);
  const brand = ws.getCell(r, 1);
  brand.value = 'FleetTrack';
  brand.font = {
    name: 'Calibri',
    bold: true,
    size: 16,
    color: { argb: 'FFFFFFFF' },
  };
  brand.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: `FF${HEADER_BG}` },
  };
  brand.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(r).height = 28;
  r += 1;

  // Company name (parent company for sub-admins too)
  ws.mergeCells(r, 1, r, colCount);
  const companyCell = ws.getCell(r, 1);
  companyCell.value = `Company: ${companyName || '—'}`;
  companyCell.font = {
    name: 'Calibri',
    bold: true,
    size: 13,
    color: { argb: `FF${BRAND_DARK}` },
  };
  companyCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF0F9FF' },
  };
  companyCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(r).height = 24;
  r += 1;

  // Report title
  ws.mergeCells(r, 1, r, colCount);
  const titleCell = ws.getCell(r, 1);
  titleCell.value = title;
  titleCell.font = {
    name: 'Calibri',
    bold: true,
    size: 12,
    color: { argb: 'FF0F172A' },
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(r).height = 20;
  r += 1;

  // Meta
  const exportedAt = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const metaLines = [
    { label: 'Exported on', value: exportedAt },
    ...(exportedBy ? [{ label: 'Exported by', value: exportedBy }] : []),
    ...meta,
  ];
  for (const m of metaLines) {
    ws.mergeCells(r, 1, r, colCount);
    const cell = ws.getCell(r, 1);
    cell.value = excelSafeText(`${m.label}: ${m.value}`);
    cell.font = { name: 'Calibri', size: 10, color: { argb: `FF${MUTED}` } };
    cell.alignment = { vertical: 'middle', indent: 1 };
    r += 1;
  }

  r += 1; // spacer

  // Table header
  const headerRow = ws.getRow(r);
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${TABLE_HEADER_BG}` },
    };
    cell.font = {
      name: 'Calibri',
      bold: true,
      size: 11,
      color: { argb: `FF${BRAND_DARK}` },
    };
    cell.border = thinBorder();
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });
  headerRow.height = 22;
  r += 1;

  // Data rows
  rows.forEach((row, idx) => {
    const dataRow = ws.getRow(r);
    columns.forEach((col, i) => {
      const cell = dataRow.getCell(i + 1);
      const raw = row[col.key];
      const isDate =
        col.date ||
        /^date$/i.test(col.header) ||
        /^date$/i.test(col.key);
      const allowWrap =
        col.wrap === true ||
        (!isDate && !col.amount && /desc/i.test(col.key + col.header));

      if (col.amount && raw !== '' && raw != null && !Number.isNaN(Number(raw))) {
        // Rs. instead of ₹ — Excel on Windows often cannot render U+20B9.
        cell.value = formatInrForExcel(Number(raw), { fractionDigits: 2 });
        cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: false };
        cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF0F172A' } };
      } else {
        cell.value = raw == null ? '' : excelSafeText(String(raw));
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'left',
          wrapText: allowWrap,
        };
        cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF0F172A' } };
      }
      cell.border = thinBorder();
      if (idx % 2 === 1) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: `FF${ALT_ROW}` },
        };
      }
    });
    dataRow.height = 20;
    r += 1;
  });

  if (rows.length === 0) {
    ws.mergeCells(r, 1, r, colCount);
    const empty = ws.getCell(r, 1);
    empty.value = 'No records to export.';
    empty.font = { name: 'Calibri', italic: true, size: 11, color: { argb: `FF${MUTED}` } };
    r += 1;
  }

  r += 1;
  ws.mergeCells(r, 1, r, colCount);
  const footer = ws.getCell(r, 1);
  footer.value = 'Generated by FleetTrack — confidential company data';
  footer.font = { name: 'Calibri', size: 9, color: { argb: `FF${MUTED}` } };

  // Accent left stripe on brand row via first cell already branded
  void BRAND;

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export type MultiSectionExcelInput = {
  companyName: string;
  title: string;
  filename: string;
  exportedBy?: string;
  meta?: { label: string; value: string }[];
  sections: {
    title: string;
    columns: ExcelColumn[];
    rows: Record<string, string | number | null | undefined>[];
  }[];
};

/** Multi-section report on one sheet (e.g. company reports). */
export async function downloadMultiSectionExcel(
  input: MultiSectionExcelInput,
): Promise<void> {
  const { companyName, title, filename, exportedBy, meta = [], sections } = input;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FleetTrack';
  wb.created = new Date();

  const maxCols = Math.max(2, ...sections.map((s) => s.columns.length));
  const ws = wb.addWorksheet('Report', {
    views: [{ showGridLines: false }],
  });

  const colWidths = Array.from({ length: maxCols }, (_, i) => {
    let width = 14;
    for (const section of sections) {
      const col = section.columns[i];
      if (!col) continue;
      if (col.width) {
        width = Math.max(width, col.width);
      } else {
        width = Math.max(width, Math.min((col.header?.length ?? 10) + 4, 40));
      }
      if (col.amount) width = Math.max(width, 16);
    }
    return { key: `c${i}`, width };
  });
  ws.columns = colWidths;

  let r = 1;
  ws.mergeCells(r, 1, r, maxCols);
  const brand = ws.getCell(r, 1);
  brand.value = 'FleetTrack';
  brand.font = { name: 'Calibri', bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  brand.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: `FF${HEADER_BG}` },
  };
  brand.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(r).height = 28;
  r += 1;

  ws.mergeCells(r, 1, r, maxCols);
  const companyCell = ws.getCell(r, 1);
  companyCell.value = `Company: ${companyName || '—'}`;
  companyCell.font = {
    name: 'Calibri',
    bold: true,
    size: 13,
    color: { argb: `FF${BRAND_DARK}` },
  };
  companyCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF0F9FF' },
  };
  companyCell.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(r).height = 24;
  r += 1;

  ws.mergeCells(r, 1, r, maxCols);
  ws.getCell(r, 1).value = title;
  ws.getCell(r, 1).font = { name: 'Calibri', bold: true, size: 12 };
  ws.getCell(r, 1).alignment = { indent: 1 };
  r += 1;

  const exportedAt = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  for (const m of [
    { label: 'Exported on', value: exportedAt },
    ...(exportedBy ? [{ label: 'Exported by', value: exportedBy }] : []),
    ...meta,
  ]) {
    ws.mergeCells(r, 1, r, maxCols);
    const cell = ws.getCell(r, 1);
    cell.value = excelSafeText(`${m.label}: ${m.value}`);
    cell.font = { name: 'Calibri', size: 10, color: { argb: `FF${MUTED}` } };
    cell.alignment = { indent: 1 };
    r += 1;
  }

  for (const section of sections) {
    r += 1;
    ws.mergeCells(r, 1, r, maxCols);
    const sec = ws.getCell(r, 1);
    sec.value = section.title;
    sec.font = {
      name: 'Calibri',
      bold: true,
      size: 11,
      color: { argb: `FF${BRAND_DARK}` },
    };
    sec.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0F2FE' },
    };
    sec.alignment = { indent: 1 };
    ws.getRow(r).height = 20;
    r += 1;

    const headerRow = ws.getRow(r);
    section.columns.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = col.header;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: `FF${TABLE_HEADER_BG}` },
      };
      cell.font = {
        name: 'Calibri',
        bold: true,
        size: 10,
        color: { argb: `FF${BRAND_DARK}` },
      };
      cell.border = thinBorder();
    });
    r += 1;

    section.rows.forEach((row, idx) => {
      const dataRow = ws.getRow(r);
      section.columns.forEach((col, i) => {
        const cell = dataRow.getCell(i + 1);
        const raw = row[col.key];
        if (col.amount && raw != null && raw !== '' && !Number.isNaN(Number(raw))) {
          cell.value = formatInrForExcel(Number(raw), { fractionDigits: 2 });
          cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: false };
          cell.font = { name: 'Calibri', size: 11 };
        } else {
          cell.value = raw == null ? '' : excelSafeText(String(raw));
          cell.font = { name: 'Calibri', size: 11 };
          cell.alignment = { vertical: 'middle', wrapText: false };
        }
        cell.border = thinBorder();
        if (idx % 2 === 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: `FF${ALT_ROW}` },
          };
        }
      });
      dataRow.height = 20;
      r += 1;
    });

    if (section.rows.length === 0) {
      ws.getCell(r, 1).value = 'No records.';
      ws.getCell(r, 1).font = {
        name: 'Calibri',
        italic: true,
        size: 10,
        color: { argb: `FF${MUTED}` },
      };
      r += 1;
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

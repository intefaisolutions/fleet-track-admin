import ExcelJS from 'exceljs';

/** Fleet brand cyan */
const BRAND = '00AEEF';
const BRAND_DARK = '0078B3';
const HEADER_BG = '0F172A';
const SECTION_BG = 'E0F2FE';
const TABLE_HEADER_BG = 'F1F5F9';
const ALT_ROW = 'F8FAFC';
const BORDER = 'CBD5E1';
const SUCCESS = '166534';
const MUTED = '64748B';

export type OwnerReportId =
  | 'monthly'
  | 'yearly'
  | 'vehicle'
  | 'category'
  | 'fuel'
  | 'detail';

export type OwnerReportsExcelInput = {
  year: string;
  month: string;
  periodLabel: string;
  ownerName: string;
  selected: Set<OwnerReportId> | OwnerReportId[];
  monthlyTotal: number;
  monthlyCount: number;
  yearlyTotal: number;
  yearlyCount: number;
  vehicleWise: { reg?: string; amount: number }[];
  categoryWise: { label: string; count: number; amount: number }[];
  fuelEfficiency: { reg?: string; kmPerLitre: number; hasData: boolean }[];
  detailRows: {
    date: string;
    vehicle: string;
    category: string;
    amount: number;
    description: string;
  }[];
};

function thinBorder(): Partial<ExcelJS.Borders> {
  const edge: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: `FF${BORDER}` } };
  return { top: edge, left: edge, bottom: edge, right: edge };
}

function isSelected(
  selected: Set<OwnerReportId> | OwnerReportId[],
  id: OwnerReportId,
): boolean {
  return selected instanceof Set ? selected.has(id) : selected.includes(id);
}

function applyAmount(cell: ExcelJS.Cell, value: number) {
  cell.value = value;
  cell.numFmt = '₹#,##0.00';
  cell.alignment = { horizontal: 'right', vertical: 'middle' };
  cell.font = { ...(cell.font ?? {}), name: 'Calibri', size: 11 };
}

function styleSectionTitle(row: ExcelJS.Row, colCount: number) {
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${SECTION_BG}` },
    };
    cell.font = {
      name: 'Calibri',
      bold: true,
      size: 12,
      color: { argb: `FF${BRAND_DARK}` },
    };
    cell.border = thinBorder();
    cell.alignment = { vertical: 'middle' };
  }
  row.height = 22;
}

function styleTableHeader(row: ExcelJS.Row, colCount: number) {
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${TABLE_HEADER_BG}` },
    };
    cell.font = {
      name: 'Calibri',
      bold: true,
      size: 10,
      color: { argb: `FF${MUTED}` },
    };
    cell.border = thinBorder();
    cell.alignment = { vertical: 'middle' };
  }
  row.height = 18;
}

function styleDataRow(row: ExcelJS.Row, colCount: number, alt: boolean) {
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    if (alt) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: `FF${ALT_ROW}` },
      };
    }
    cell.border = thinBorder();
    cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF0F172A' } };
    cell.alignment = { vertical: 'middle', ...(cell.alignment ?? {}) };
  }
}

export async function downloadOwnerReportsExcel(
  input: OwnerReportsExcelInput,
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FleetTrack';
  wb.created = new Date();

  const ws = wb.addWorksheet('Expense Reports', {
    views: [{ showGridLines: false }],
    properties: { defaultRowHeight: 18 },
  });

  ws.columns = [
    { key: 'a', width: 28 },
    { key: 'b', width: 22 },
    { key: 'c', width: 18 },
    { key: 'd', width: 16 },
    { key: 'e', width: 36 },
  ];

  const colSpan = 5;
  let r = 1;

  // —— Brand title banner ——
  ws.mergeCells(r, 1, r, colSpan);
  const title = ws.getCell(r, 1);
  title.value = 'FleetTrack — Expense Reports';
  title.font = {
    name: 'Calibri',
    bold: true,
    size: 16,
    color: { argb: 'FFFFFFFF' },
  };
  title.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: `FF${HEADER_BG}` },
  };
  title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(r).height = 28;
  r += 1;

  ws.mergeCells(r, 1, r, colSpan);
  const sub = ws.getCell(r, 1);
  sub.value = 'Vehicle Owner Portal';
  sub.font = {
    name: 'Calibri',
    bold: true,
    size: 11,
    color: { argb: 'FFFFFFFF' },
  };
  sub.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: `FF${BRAND}` },
  };
  sub.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(r).height = 20;
  r += 1;

  // Meta block
  const metaRows: [string, string][] = [
    ['Owner', input.ownerName || '—'],
    ['Period', input.periodLabel],
    ['Generated', new Date().toLocaleString('en-IN')],
  ];
  for (const [label, value] of metaRows) {
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).font = {
      name: 'Calibri',
      bold: true,
      size: 10,
      color: { argb: `FF${MUTED}` },
    };
    ws.mergeCells(r, 2, r, colSpan);
    ws.getCell(r, 2).value = value;
    ws.getCell(r, 2).font = { name: 'Calibri', size: 11, bold: true };
    for (let c = 1; c <= colSpan; c++) {
      ws.getCell(r, c).border = thinBorder();
      ws.getCell(r, c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFFFF' },
      };
    }
    r += 1;
  }

  r += 1; // spacer

  const addSummaryBlock = (
    titleText: string,
    rows: { label: string; value: string | number; isAmount?: boolean }[],
  ) => {
    ws.mergeCells(r, 1, r, colSpan);
    ws.getCell(r, 1).value = titleText;
    styleSectionTitle(ws.getRow(r), colSpan);
    r += 1;

    for (const row of rows) {
      ws.getCell(r, 1).value = row.label;
      ws.getCell(r, 1).font = {
        name: 'Calibri',
        size: 11,
        color: { argb: `FF${MUTED}` },
      };
      if (row.isAmount && typeof row.value === 'number') {
        applyAmount(ws.getCell(r, 2), row.value);
        ws.getCell(r, 2).font = {
          name: 'Calibri',
          size: 12,
          bold: true,
          color: { argb: `FF${SUCCESS}` },
        };
      } else {
        ws.getCell(r, 2).value = row.value;
        ws.getCell(r, 2).font = { name: 'Calibri', size: 11, bold: true };
      }
      for (let c = 1; c <= 2; c++) {
        ws.getCell(r, c).border = thinBorder();
      }
      r += 1;
    }
    r += 1;
  };

  if (isSelected(input.selected, 'monthly')) {
    addSummaryBlock('Monthly Report', [
      { label: 'Period', value: input.periodLabel },
      { label: 'Total Amount', value: input.monthlyTotal, isAmount: true },
      { label: 'Expense count', value: input.monthlyCount },
    ]);
  }

  if (isSelected(input.selected, 'yearly')) {
    addSummaryBlock('Yearly Report', [
      { label: 'Year', value: input.year },
      { label: 'Total Amount', value: input.yearlyTotal, isAmount: true },
      { label: 'Expense count', value: input.yearlyCount },
    ]);
  }

  if (isSelected(input.selected, 'vehicle')) {
    ws.mergeCells(r, 1, r, colSpan);
    ws.getCell(r, 1).value = `Vehicle-wise Report (${input.year})`;
    styleSectionTitle(ws.getRow(r), colSpan);
    r += 1;

    ws.getCell(r, 1).value = 'Registration';
    ws.getCell(r, 2).value = 'Amount (₹)';
    styleTableHeader(ws.getRow(r), 2);
    r += 1;

    input.vehicleWise.forEach((v, i) => {
      ws.getCell(r, 1).value = v.reg ?? '—';
      applyAmount(ws.getCell(r, 2), v.amount);
      styleDataRow(ws.getRow(r), 2, i % 2 === 1);
      r += 1;
    });
    r += 1;
  }

  if (isSelected(input.selected, 'category')) {
    ws.mergeCells(r, 1, r, colSpan);
    ws.getCell(r, 1).value = `Category-wise Report (${input.year})`;
    styleSectionTitle(ws.getRow(r), colSpan);
    r += 1;

    ws.getCell(r, 1).value = 'Category';
    ws.getCell(r, 2).value = 'Count';
    ws.getCell(r, 3).value = 'Amount (₹)';
    styleTableHeader(ws.getRow(r), 3);
    r += 1;

    input.categoryWise.forEach((c, i) => {
      ws.getCell(r, 1).value = c.label;
      ws.getCell(r, 2).value = c.count;
      ws.getCell(r, 2).alignment = { horizontal: 'center', vertical: 'middle' };
      applyAmount(ws.getCell(r, 3), c.amount);
      styleDataRow(ws.getRow(r), 3, i % 2 === 1);
      r += 1;
    });
    r += 1;
  }

  if (isSelected(input.selected, 'fuel')) {
    ws.mergeCells(r, 1, r, colSpan);
    ws.getCell(r, 1).value = `Fuel Efficiency Report (${input.year})`;
    styleSectionTitle(ws.getRow(r), colSpan);
    r += 1;

    ws.getCell(r, 1).value = 'Registration';
    ws.getCell(r, 2).value = 'Km per litre';
    styleTableHeader(ws.getRow(r), 2);
    r += 1;

    input.fuelEfficiency.forEach((f, i) => {
      ws.getCell(r, 1).value = f.reg ?? '—';
      ws.getCell(r, 2).value =
        f.hasData && f.kmPerLitre > 0 ? f.kmPerLitre : '—';
      ws.getCell(r, 2).alignment = { horizontal: 'right', vertical: 'middle' };
      styleDataRow(ws.getRow(r), 2, i % 2 === 1);
      r += 1;
    });
    r += 1;
  }

  if (isSelected(input.selected, 'detail')) {
    ws.mergeCells(r, 1, r, colSpan);
    ws.getCell(r, 1).value = `Expense Detail — ${input.year}`;
    styleSectionTitle(ws.getRow(r), colSpan);
    r += 1;

    const headers = ['Date', 'Vehicle', 'Category', 'Amount (₹)', 'Description'];
    headers.forEach((h, i) => {
      ws.getCell(r, i + 1).value = h;
    });
    styleTableHeader(ws.getRow(r), 5);
    r += 1;

    input.detailRows.forEach((row, i) => {
      ws.getCell(r, 1).value = row.date;
      ws.getCell(r, 2).value = row.vehicle;
      ws.getCell(r, 3).value = row.category;
      applyAmount(ws.getCell(r, 4), row.amount);
      ws.getCell(r, 5).value = row.description || '—';
      styleDataRow(ws.getRow(r), 5, i % 2 === 1);
      r += 1;
    });
    r += 1;
  }

  // Footer
  ws.mergeCells(r, 1, r, colSpan);
  const foot = ws.getCell(r, 1);
  foot.value = 'Generated by FleetTrack · For internal use only';
  foot.font = {
    name: 'Calibri',
    size: 9,
    italic: true,
    color: { argb: `FF${MUTED}` },
  };
  foot.alignment = { horizontal: 'center', vertical: 'middle' };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `FleetTrack_Reports_${input.year}_${input.month}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

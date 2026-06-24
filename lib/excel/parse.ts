import ExcelJS from "exceljs";
import type { ParsedRow, TemplateColumnSchema } from "@/types";
import {
  DEFAULT_COLUMN_HEADERS,
  normalizeColumnName,
} from "@/lib/template/columns";

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in value && value.text) {
    return String(value.text).trim();
  }
  if (value instanceof Date) return value.toISOString().split("T")[0] ?? "";
  return String(value).trim();
}

const HEADER_HINTS = new Set(
  [
    ...DEFAULT_COLUMN_HEADERS,
    "Huisnummer",
    "E-mail",
    "Telefoon/Mobiel",
    "Nummer",
  ].map((h) => h.toLowerCase())
);

export interface SheetLayout {
  headerRowNumber: number;
  startColumn: number;
  headers: string[];
}

export function detectSheetLayout(sheet: ExcelJS.Worksheet): SheetLayout | null {
  const maxScanRows = Math.min(30, sheet.rowCount || 30);
  const maxCols = Math.min(20, sheet.columnCount || 20);

  let best: SheetLayout | null = null;

  for (let rowNum = 1; rowNum <= maxScanRows; rowNum++) {
    const row = sheet.getRow(rowNum);

    for (let startCol = 1; startCol <= maxCols; startCol++) {
      const rawHeaders: string[] = [];
      let matchCount = 0;
      let actualStartCol = startCol;

      for (let col = startCol; col <= maxCols; col++) {
        const raw = cellToString(row.getCell(col).value);
        if (!raw) {
          if (rawHeaders.length > 0) break;
          continue;
        }

        if (rawHeaders.length === 0) {
          actualStartCol = col;
        }

        const normalized = normalizeColumnName(raw);
        const isKnown =
          HEADER_HINTS.has(raw.toLowerCase()) ||
          HEADER_HINTS.has(normalized.toLowerCase()) ||
          DEFAULT_COLUMN_HEADERS.some(
            (h) => h.toLowerCase() === normalized.toLowerCase()
          );

        if (isKnown || rawHeaders.length > 0) {
          rawHeaders.push(normalized);
          if (isKnown) matchCount++;
        } else if (rawHeaders.length === 0) {
          continue;
        } else {
          break;
        }
      }

      if (matchCount >= 3 && (!best || matchCount > best.headers.length)) {
        best = {
          headerRowNumber: rowNum,
          startColumn: actualStartCol,
          headers: rawHeaders,
        };
      }
    }
  }

  return best;
}

function readRowValues(
  row: ExcelJS.Row,
  layout: SheetLayout
): Record<string, string> {
  const values: Record<string, string> = {};
  layout.headers.forEach((header, index) => {
    values[header] = cellToString(row.getCell(layout.startColumn + index).value);
  });
  return values;
}

export async function parseExcelBuffer(buffer: Buffer): Promise<ParsedRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error("Excel-bestand bevat geen werkblad");
  }

  const layout = detectSheetLayout(sheet);
  if (!layout) {
    throw new Error(
      "Geen kolomkoppen gevonden. Gebruik de aanlevering-template (Aanhef, Naam, Adres, Nummer, …)."
    );
  }

  const rows: ParsedRow[] = [];
  let dataIndex = 0;

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= layout.headerRowNumber) return;

    const values = readRowValues(row, layout);
    const hasData = Object.values(values).some((v) => v.trim());
    if (!hasData) return;

    rows.push({ rowIndex: dataIndex, values });
    dataIndex++;
  });

  return rows;
}

export function extractColumnSchemaFromHeaders(
  headers: string[]
): TemplateColumnSchema {
  const normalized = headers
    .map((h) => normalizeColumnName(h))
    .filter((h) => h && !h.toLowerCase().includes("aanleveren"));

  const inferType = (header: string) => {
    const h = header.toLowerCase();
    if (h.includes("email") || h.includes("e-mail")) return "email" as const;
    if (h.includes("tel") || h.includes("telefoon") || h.includes("mobiel"))
      return "phone" as const;
    if (h.includes("postcode")) return "postcode" as const;
    return "text" as const;
  };

  const requiredDefaults = new Set(["naam", "adres", "nummer", "postcode", "woonplaats"]);

  return {
    columns: normalized.map((name, order) => ({
      name,
      required: requiredDefaults.has(name.toLowerCase()),
      dataType: inferType(name),
      order,
    })),
  };
}

export async function getHeadersFromBuffer(buffer: Buffer): Promise<string[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const layout = detectSheetLayout(sheet);
  return layout?.headers ?? [];
}

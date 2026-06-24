import ExcelJS from "exceljs";
import { format } from "date-fns";
import type {
  CellCorrection,
  ProcessedRow,
  TemplateColumnSchema,
} from "@/types";

function getDisplayValue(
  correction: CellCorrection | undefined,
  rowData: Record<string, string>,
  column: string
): string {
  if (!correction) return rowData[column] ?? "";
  if (correction.final_value !== null && correction.final_value !== undefined) {
    return correction.final_value;
  }
  if (correction.approved === true && correction.proposed_value) {
    return correction.proposed_value;
  }
  if (correction.approved === false) {
    return correction.original_value ?? rowData[column] ?? "";
  }
  if (correction.requires_approval && correction.proposed_value) {
    return correction.proposed_value;
  }
  return rowData[column] ?? "";
}

export async function buildExportWorkbook(
  templateSchema: TemplateColumnSchema,
  rows: ProcessedRow[],
  correctionsByRow: Map<string, CellCorrection[]>,
  processedAt: Date
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const mainSheet = workbook.addWorksheet("Gecorrigeerde lijst");
  const auditSheet = workbook.addWorksheet("Audit");

  const columns = [...templateSchema.columns].sort((a, b) => a.order - b.order);
  const columnNames = columns.map((c) => c.name);

  mainSheet.addRow(columnNames);
  mainSheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    const rowCorrections = correctionsByRow.get(row.id) ?? [];
    const correctionMap = new Map(
      rowCorrections.map((c) => [c.column_name, c])
    );
    mainSheet.addRow(
      columnNames.map((col) =>
        getDisplayValue(correctionMap.get(col), row.row_data, col)
      )
    );
  }

  auditSheet.addRow([
    "Rij",
    "Kolom",
    "Originele waarde",
    "Voorgestelde waarde",
    "Definitieve waarde",
    "Status",
    "Bron",
    "Opmerking",
    "Verwerkt op",
  ]);
  auditSheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    const rowCorrections = correctionsByRow.get(row.id) ?? [];
    if (rowCorrections.length === 0) {
      auditSheet.addRow([
        row.row_index + 1,
        "(geen wijzigingen)",
        "",
        "",
        "",
        row.status,
        "",
        "",
        format(processedAt, "yyyy-MM-dd HH:mm"),
      ]);
      continue;
    }

    for (const c of rowCorrections) {
      auditSheet.addRow([
        row.row_index + 1,
        c.column_name,
        c.original_value ?? "",
        c.proposed_value ?? "",
        c.final_value ?? getDisplayValue(c, row.row_data, c.column_name),
        c.status,
        c.source ?? "",
        c.reason ?? "",
        format(processedAt, "yyyy-MM-dd HH:mm"),
      ]);
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function exportFilename(): string {
  return `gecorrigeerde_lijst_${format(new Date(), "yyyy-MM-dd_HH-mm")}.xlsx`;
}

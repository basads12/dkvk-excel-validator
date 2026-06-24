import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildExportWorkbook, exportFilename } from "@/lib/excel/export-service";
import { parseExcelBuffer } from "@/lib/excel/parse";
import { DEFAULT_TEMPLATE_SCHEMA } from "@/types";

async function createTestWorkbook(rows: string[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Data");
  sheet.addRow([
    "Aanhef",
    "Naam",
    "Adres",
    "Nummer",
    "Postcode",
    "Woonplaats",
    "Email",
    "Tel/mobiel",
  ]);
  for (const row of rows) {
    sheet.addRow(row);
  }
  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}

describe("excel parse and export", () => {
  it("parses xlsx buffer into rows", async () => {
    const buffer = await createTestWorkbook([
      ["Dhr.", "Jan Jansen", "Oudegracht", "123", "3511 AB", "Utrecht", "jan@test.nl", "0612345678"],
    ]);

    const rows = await parseExcelBuffer(buffer);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.values["Naam"]).toBe("Jan Jansen");
    expect(rows[0]!.values["Postcode"]).toBe("3511 AB");
  });

  it("exports workbook with correct filename format", () => {
    const filename = exportFilename();
    expect(filename).toMatch(/^gecorrigeerde_lijst_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.xlsx$/);
  });

  it("builds export with main and audit sheets", async () => {
    const buffer = await buildExportWorkbook(
      DEFAULT_TEMPLATE_SCHEMA,
      [
        {
          id: "row-1",
          upload_id: "upload-1",
          row_index: 0,
          row_data: {
            Naam: "Jan",
            Adres: "Test",
            Nummer: "1",
            Postcode: "3511 AB",
            Woonplaats: "Utrecht",
          },
          status: "valid",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      new Map(),
      new Date()
    );

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    expect(workbook.worksheets).toHaveLength(2);
    expect(workbook.worksheets[0]!.name).toBe("Gecorrigeerde lijst");
    expect(workbook.worksheets[1]!.name).toBe("Audit");
  });
});

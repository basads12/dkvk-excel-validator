import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { detectSheetLayout, getHeadersFromBuffer, parseExcelBuffer } from "@/lib/excel/parse";
import { DEFAULT_COLUMN_HEADERS } from "@/types";

const FIXTURE = path.join(
  __dirname,
  "../fixtures/vloerenfabriek-template.xlsx"
);

describe("Vloerenfabriek aanlevering template", () => {
  it("detects headers on row 3 with offset column", async () => {
    const buffer = readFileSync(FIXTURE);
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as import("exceljs").Buffer);
    const layout = detectSheetLayout(wb.worksheets[0]!);

    expect(layout).not.toBeNull();
    expect(layout!.headerRowNumber).toBe(3);
    expect(layout!.startColumn).toBe(2);
    expect(layout!.headers).toEqual([...DEFAULT_COLUMN_HEADERS]);
  });

  it("extracts headers via getHeadersFromBuffer", async () => {
    const buffer = readFileSync(FIXTURE);
    const headers = await getHeadersFromBuffer(buffer);
    expect(headers).toEqual([...DEFAULT_COLUMN_HEADERS]);
  });

  it("parses empty data sheet without errors", async () => {
    const buffer = readFileSync(FIXTURE);
    const rows = await parseExcelBuffer(buffer);
    expect(rows).toEqual([]);
  });
});

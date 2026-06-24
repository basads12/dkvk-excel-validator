export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_ROWS = 5000;
export const MAX_UPLOADS_PER_HOUR = 10;

export const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function sanitizeFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? "bestand.xlsx";
  const sanitized = base
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 200);
  return sanitized.endsWith(".xlsx") ? sanitized : `${sanitized}.xlsx`;
}

export function isValidXlsxFile(file: File): boolean {
  if (!file.name.toLowerCase().endsWith(".xlsx")) return false;
  if (file.size > MAX_FILE_SIZE_BYTES) return false;
  if (file.type && file.type !== XLSX_MIME) return false;
  return true;
}

export function validateXlsxBuffer(buffer: Buffer): boolean {
  // XLSX files are ZIP archives starting with PK
  return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

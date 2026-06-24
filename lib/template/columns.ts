import type { TemplateColumnSchema } from "@/types";

/** Canonical aanlevering-kolommen (Vloerenfabriek-template) */
export const DEFAULT_COLUMN_HEADERS = [
  "Aanhef",
  "Naam",
  "Adres",
  "Nummer",
  "Postcode",
  "Woonplaats",
  "Email",
  "Tel/mobiel",
] as const;

export const DEFAULT_TEMPLATE_SCHEMA: TemplateColumnSchema = {
  columns: [
    { name: "Aanhef", required: false, dataType: "text", order: 0 },
    { name: "Naam", required: true, dataType: "text", order: 1 },
    { name: "Adres", required: true, dataType: "text", order: 2 },
    { name: "Nummer", required: true, dataType: "text", order: 3 },
    { name: "Postcode", required: true, dataType: "postcode", order: 4 },
    { name: "Woonplaats", required: true, dataType: "text", order: 5 },
    { name: "Email", required: false, dataType: "email", order: 6 },
    { name: "Tel/mobiel", required: false, dataType: "phone", order: 7 },
  ],
};

/** Normaliseert kolomnamen naar canonical template-namen */
export const COLUMN_NAME_ALIASES: Record<string, string> = {
  aanhef: "Aanhef",
  naam: "Naam",
  name: "Naam",
  adres: "Adres",
  straat: "Adres",
  straatnaam: "Adres",
  nummer: "Nummer",
  huisnummer: "Nummer",
  "huis nr": "Nummer",
  "huis nr.": "Nummer",
  postcode: "Postcode",
  woonplaats: "Woonplaats",
  plaats: "Woonplaats",
  email: "Email",
  "e-mail": "Email",
  "tel/mobiel": "Tel/mobiel",
  "telefoon/mobiel": "Tel/mobiel",
  telefoon: "Tel/mobiel",
  mobiel: "Tel/mobiel",
};

export function normalizeColumnName(header: string): string {
  const key = header.trim().toLowerCase().replace(/\s+/g, " ");
  return COLUMN_NAME_ALIASES[key] ?? header.trim();
}

export function getRowValue(
  values: Record<string, string>,
  ...keys: string[]
): string {
  for (const key of keys) {
    const v = values[key]?.trim();
    if (v) return v;
  }
  return "";
}

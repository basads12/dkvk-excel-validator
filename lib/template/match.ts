import type { TemplateColumnSchema } from "@/types";
import { COLUMN_NAME_ALIASES, normalizeColumnName } from "@/lib/template/columns";

const COLUMN_ALIASES: Record<string, string[]> = {
  Aanhef: ["aanhef", "titel", "salutation"],
  Naam: ["naam", "name", "volledige naam", "contactpersoon"],
  Adres: ["adres", "straat", "straatnaam", "address"],
  Nummer: ["nummer", "huisnummer", "huis nr", "huis nr."],
  Postcode: ["postcode", "pc", "zip"],
  Woonplaats: ["woonplaats", "plaats", "stad", "city"],
  Email: ["email", "e-mail", "e mail", "mail"],
  "Tel/mobiel": ["tel/mobiel", "telefoon/mobiel", "telefoon", "mobiel", "tel", "phone"],
};

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, " ");
}

export interface ColumnMapping {
  sourceColumn: string | null;
  templateColumn: string;
  matched: boolean;
}

export function matchColumns(
  sourceHeaders: string[],
  templateSchema: TemplateColumnSchema
): ColumnMapping[] {
  const usedSources = new Set<string>();
  const normalizedSources = new Map<string, string>();

  for (const h of sourceHeaders) {
    normalizedSources.set(normalizeKey(h), h);
    normalizedSources.set(normalizeKey(normalizeColumnName(h)), h);
  }

  return templateSchema.columns.map((col) => {
    const exact = sourceHeaders.find(
      (h) =>
        (normalizeKey(h) === normalizeKey(col.name) ||
          normalizeColumnName(h) === col.name) &&
        !usedSources.has(h)
    );
    if (exact) {
      usedSources.add(exact);
      return { sourceColumn: exact, templateColumn: col.name, matched: true };
    }

    const aliases = COLUMN_ALIASES[col.name] ?? [col.name.toLowerCase()];
    for (const alias of aliases) {
      const match = normalizedSources.get(normalizeKey(alias));
      if (match && !usedSources.has(match)) {
        usedSources.add(match);
        return { sourceColumn: match, templateColumn: col.name, matched: true };
      }
    }

    // Reverse lookup via COLUMN_NAME_ALIASES
    for (const [alias, canonical] of Object.entries(COLUMN_NAME_ALIASES)) {
      if (canonical === col.name) {
        const match = normalizedSources.get(normalizeKey(alias));
        if (match && !usedSources.has(match)) {
          usedSources.add(match);
          return { sourceColumn: match, templateColumn: col.name, matched: true };
        }
      }
    }

    return { sourceColumn: null, templateColumn: col.name, matched: false };
  });
}

export function remapRowToTemplate(
  values: Record<string, string>,
  mappings: ColumnMapping[]
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const mapping of mappings) {
    if (mapping.sourceColumn) {
      result[mapping.templateColumn] = values[mapping.sourceColumn] ?? "";
    } else {
      result[mapping.templateColumn] = "";
    }
  }
  return result;
}

export function getUnmappedSourceColumns(
  sourceHeaders: string[],
  mappings: ColumnMapping[]
): string[] {
  const mapped = new Set(
    mappings.filter((m) => m.sourceColumn).map((m) => m.sourceColumn!)
  );
  return sourceHeaders.filter((h) => !mapped.has(h));
}

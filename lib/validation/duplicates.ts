import type { ProposedCorrection } from "@/types";

function rowHash(values: Record<string, string>): string {
  const keys = ["Naam", "Adres", "Postcode"];
  return keys.map((k) => values[k]?.toLowerCase().trim() ?? "").join("|");
}

export function findDuplicateRowIndexes(
  rows: Record<string, string>[]
): Map<number, number> {
  const seen = new Map<string, number>();
  const duplicates = new Map<number, number>();

  rows.forEach((values, index) => {
    const hash = rowHash(values);
    if (!hash.replace(/\|/g, "")) return;
    const firstIndex = seen.get(hash);
    if (firstIndex !== undefined) {
      duplicates.set(index, firstIndex);
    } else {
      seen.set(hash, index);
    }
  });

  return duplicates;
}

export function duplicateCorrectionForRow(
  rowIndex: number,
  values: Record<string, string>,
  duplicates: Map<number, number>
): ProposedCorrection | null {
  const firstIndex = duplicates.get(rowIndex);
  if (firstIndex === undefined) return null;

  return {
    column: "Naam",
    rowIndex,
    originalValue: values["Naam"] ?? "",
    proposedValue: values["Naam"] ?? "",
    status: "needs_review",
    confidence: 0.9,
    source: "duplicate-rows",
    reason: `Mogelijk duplicaat (ook op rij ${firstIndex + 1})`,
    requiresApproval: true,
  };
}

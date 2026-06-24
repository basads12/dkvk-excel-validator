import type { ProposedCorrection } from "@/types";
import type { ValidationContext, ValidationRule } from "../types";
import {
  formatDutchName,
  hasSuspiciousName,
  isKnownAanhef,
  splitAanhefFromNaam,
  suggestAanhef,
} from "../format";
import { getRowValue } from "@/lib/template/columns";

function findColumn(ctx: ValidationContext, names: string[]) {
  return ctx.templateSchema.columns.find((c) =>
    names.some((n) => c.name.toLowerCase() === n.toLowerCase())
  );
}

export const aanhefRule: ValidationRule = {
  id: "aanhef-format",
  name: "Aanhef",
  validate(ctx) {
    const col = findColumn(ctx, ["Aanhef"]);
    if (!col) return [];

    const value = ctx.values[col.name]?.trim() ?? "";
    if (!value) return [];

    const suggested = suggestAanhef(value);
    if (suggested && suggested !== value) {
      return [
        {
          column: col.name,
          rowIndex: ctx.rowIndex,
          originalValue: value,
          proposedValue: suggested,
          status: "needs_review",
          confidence: 0.97,
          source: "aanhef-format",
          reason: `Controleer aanhef. Voorgesteld: "${suggested}" (bijv. Dhr., Mevr., Fam.)`,
          requiresApproval: true,
        },
      ];
    }

    if (!isKnownAanhef(value)) {
      return [
        {
          column: col.name,
          rowIndex: ctx.rowIndex,
          originalValue: value,
          proposedValue: value,
          status: "needs_review",
          confidence: 0.6,
          source: "aanhef-format",
          reason:
            "Onbekende aanhef — controleer of Dhr., Mevr. of Fam. bedoeld is",
          requiresApproval: true,
        },
      ];
    }

    return [];
  },
};

export const naamRule: ValidationRule = {
  id: "naam-format",
  name: "Naam",
  validate(ctx) {
    const naamCol = findColumn(ctx, ["Naam"]);
    if (!naamCol) return [];

    const aanhefCol = findColumn(ctx, ["Aanhef"]);
    const value = ctx.values[naamCol.name]?.trim() ?? "";
    if (!value) return [];

    const corrections: ProposedCorrection[] = [];
    const split = splitAanhefFromNaam(value);
    const currentAanhef = aanhefCol
      ? getRowValue(ctx.values, "Aanhef")
      : "";

    let proposedNaam = split?.rest ?? value;

    if (split && !currentAanhef) {
      corrections.push({
        column: naamCol.name,
        rowIndex: ctx.rowIndex,
        originalValue: value,
        proposedValue: split.rest,
        status: "needs_review",
        confidence: 0.92,
        source: "naam-format",
        reason: `Aanhef "${split.aanhef}" hoort in kolom Aanhef. Voorgestelde naam: "${split.rest}"`,
        requiresApproval: true,
      });

      if (aanhefCol) {
        corrections.push({
          column: aanhefCol.name,
          rowIndex: ctx.rowIndex,
          originalValue: "",
          proposedValue: split.aanhef,
          status: "needs_review",
          confidence: 0.92,
          source: "naam-format",
          reason: `Aanhef "${split.aanhef}" uit naamveld overnemen`,
          requiresApproval: true,
        });
      }
      proposedNaam = split.rest;
    }

    const formatted = formatDutchName(proposedNaam);
    if (formatted && formatted !== proposedNaam) {
      const alreadyHasNaamCorrection = corrections.some(
        (c) => c.column === naamCol.name
      );
      if (!alreadyHasNaamCorrection) {
        corrections.push({
          column: naamCol.name,
          rowIndex: ctx.rowIndex,
          originalValue: value,
          proposedValue: formatted,
          status: "needs_review",
          confidence: 0.88,
          source: "naam-format",
          reason: `Controleer schrijfwijze naam. Voorgesteld: "${formatted}"`,
          requiresApproval: true,
        });
      } else {
        const naamCorrection = corrections.find((c) => c.column === naamCol.name);
        if (naamCorrection) {
          naamCorrection.proposedValue = formatted;
          naamCorrection.reason = `Controleer schrijfwijze naam. Voorgesteld: "${formatted}"`;
        }
      }
    } else if (hasSuspiciousName(proposedNaam)) {
      corrections.push({
        column: naamCol.name,
        rowIndex: ctx.rowIndex,
        originalValue: value,
        proposedValue: proposedNaam,
        status: "needs_review",
        confidence: 0.7,
        source: "naam-format",
        reason:
          "Naam bevat ongebruikelijke tekens of opmaak — handmatig controleren",
        requiresApproval: true,
      });
    }

    return corrections;
  },
};

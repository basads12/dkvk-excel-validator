import type { CorrectionStatus, ProposedCorrection } from "@/types";
import {
  isValidDutchPostcode,
  isValidEmail,
  isValidPhone,
  normalizePostcode,
} from "../normalize";
import {
  formatPhoneDisplay,
  normalizeEmail,
  suggestEmail,
} from "../format";
import type { ValidationContext, ValidationRule } from "../types";
import { aanhefRule, naamRule } from "./aanhef-naam";

export type { ValidationContext, ValidationRule } from "../types";
export { worstStatus } from "../types";

function findColumnByType(
  ctx: ValidationContext,
  dataType: string,
  fallbackNames: string[] = []
) {
  return (
    ctx.templateSchema.columns.find((c) => c.dataType === dataType) ??
    ctx.templateSchema.columns.find((c) =>
      fallbackNames.some((n) => c.name.toLowerCase() === n.toLowerCase())
    )
  );
}

export const requiredFieldsRule: ValidationRule = {
  id: "required-fields",
  name: "Verplichte velden",
  validate(ctx) {
    const issues: ProposedCorrection[] = [];
    for (const col of ctx.templateSchema.columns) {
      if (!col.required) continue;
      const value = ctx.values[col.name]?.trim() ?? "";
      if (!value) {
        issues.push({
          column: col.name,
          rowIndex: ctx.rowIndex,
          originalValue: "",
          proposedValue: "",
          status: "missing_data",
          confidence: 1,
          source: "required-fields",
          reason: `Verplicht veld '${col.name}' is leeg`,
          requiresApproval: false,
        });
      }
    }
    return issues;
  },
};

export const dutchPostcodeRule: ValidationRule = {
  id: "dutch-postcode",
  name: "Nederlandse postcode",
  validate(ctx) {
    const col = findColumnByType(ctx, "postcode", ["Postcode"]);
    if (!col) return [];
    const value = ctx.values[col.name]?.trim() ?? "";
    if (!value) return [];
    if (!isValidDutchPostcode(value)) {
      const normalized = normalizePostcode(value);
      if (isValidDutchPostcode(normalized) && normalized !== value) {
        return [
          {
            column: col.name,
            rowIndex: ctx.rowIndex,
            originalValue: value,
            proposedValue: normalized,
            status: "needs_review",
            confidence: 0.98,
            source: "dutch-postcode",
            reason: "Controleer postcode. Voorgesteld formaat: 1234 AB",
            requiresApproval: true,
          },
        ];
      }
      return [
        {
          column: col.name,
          rowIndex: ctx.rowIndex,
          originalValue: value,
          proposedValue: value,
          status: "needs_review",
          confidence: 1,
          source: "dutch-postcode",
          reason: "Ongeldige Nederlandse postcode — handmatig controleren",
          requiresApproval: true,
        },
      ];
    }
    return [];
  },
};

export const emailFormatRule: ValidationRule = {
  id: "email-format",
  name: "E-mailformaat",
  validate(ctx) {
    const col = findColumnByType(ctx, "email", ["Email", "E-mail"]);
    if (!col) return [];
    const value = ctx.values[col.name]?.trim() ?? "";
    if (!value) return [];

    const suggested = suggestEmail(value);
    if (suggested && isValidEmail(suggested)) {
      return [
        {
          column: col.name,
          rowIndex: ctx.rowIndex,
          originalValue: value,
          proposedValue: suggested,
          status: "needs_review",
          confidence: 0.95,
          source: "email-format",
          reason: `Controleer e-mailadres. Voorgesteld: "${suggested}"`,
          requiresApproval: true,
        },
      ];
    }

    if (!isValidEmail(value)) {
      return [
        {
          column: col.name,
          rowIndex: ctx.rowIndex,
          originalValue: value,
          proposedValue: value,
          status: "needs_review",
          confidence: 1,
          source: "email-format",
          reason: "Ongeldig e-mailadres — handmatig controleren",
          requiresApproval: true,
        },
      ];
    }

    return [];
  },
};

export const phoneFormatRule: ValidationRule = {
  id: "phone-format",
  name: "Telefoonformaat",
  validate(ctx) {
    const col = findColumnByType(ctx, "phone", ["Tel/mobiel", "Telefoon/Mobiel"]);
    if (!col) return [];
    const value = ctx.values[col.name]?.trim() ?? "";
    if (!value) return [];

    const formatted = formatPhoneDisplay(value);

    if (formatted && formatted !== value && isValidPhone(formatted)) {
      return [
        {
          column: col.name,
          rowIndex: ctx.rowIndex,
          originalValue: value,
          proposedValue: formatted,
          status: "needs_review",
          confidence: 0.93,
          source: "phone-format",
          reason: `Controleer telefoonnummer. Voorgesteld: "${formatted}"`,
          requiresApproval: true,
        },
      ];
    }

    if (!isValidPhone(value)) {
      return [
        {
          column: col.name,
          rowIndex: ctx.rowIndex,
          originalValue: value,
          proposedValue: formatted ?? value,
          status: "needs_review",
          confidence: 0.6,
          source: "phone-format",
          reason: "Telefoonnummer voldoet niet aan NL-formaat — handmatig controleren",
          requiresApproval: true,
        },
      ];
    }

    return [];
  },
};

export const validationRules: ValidationRule[] = [
  requiredFieldsRule,
  aanhefRule,
  naamRule,
  dutchPostcodeRule,
  emailFormatRule,
  phoneFormatRule,
];

export function runValidationRules(
  ctx: ValidationContext,
  rules: ValidationRule[] = validationRules
): ProposedCorrection[] {
  return rules.flatMap((rule) => rule.validate(ctx));
}

export function createDuplicateRowsRule(): ValidationRule {
  const seen = new Map<string, number[]>();
  return {
    id: "duplicate-rows",
    name: "Dubbele records",
    validate(ctx) {
      const hash = ["Naam", "Adres", "Postcode"]
        .map((k) => ctx.values[k]?.toLowerCase().trim() ?? "")
        .join("|");
      if (!hash.replace(/\|/g, "")) return [];
      const existing = seen.get(hash) ?? [];
      existing.push(ctx.rowIndex);
      seen.set(hash, existing);

      if (existing.length > 1) {
        return [
          {
            column: "Naam",
            rowIndex: ctx.rowIndex,
            originalValue: ctx.values["Naam"] ?? "",
            proposedValue: ctx.values["Naam"] ?? "",
            status: "needs_review",
            confidence: 0.9,
            source: "duplicate-rows",
            reason: `Mogelijk duplicaat (ook op rij ${existing[0]! + 1})`,
            requiresApproval: true,
          },
        ];
      }
      return [];
    },
  };
}

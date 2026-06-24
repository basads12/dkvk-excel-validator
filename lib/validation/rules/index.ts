import type {
  CorrectionStatus,
  ProposedCorrection,
  TemplateColumnSchema,
} from "@/types";
import {
  isValidDutchPostcode,
  isValidEmail,
  isValidPhone,
  normalizePostcode,
} from "../normalize";

export interface ValidationContext {
  rowIndex: number;
  values: Record<string, string>;
  templateSchema: TemplateColumnSchema;
  allRows: Record<string, string>[];
}

export interface ValidationRule {
  id: string;
  name: string;
  validate(ctx: ValidationContext): ProposedCorrection[];
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
    const col = ctx.templateSchema.columns.find((c) => c.dataType === "postcode");
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
            status: "corrected",
            confidence: 0.98,
            source: "dutch-postcode",
            reason: "Postcode genormaliseerd naar formaat 1234 AB",
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
          status: "error",
          confidence: 1,
          source: "dutch-postcode",
          reason: "Ongeldige Nederlandse postcode",
          requiresApproval: false,
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
    const col = ctx.templateSchema.columns.find((c) => c.dataType === "email");
    if (!col) return [];
    const value = ctx.values[col.name]?.trim() ?? "";
    if (!value) return [];
    if (!isValidEmail(value)) {
      return [
        {
          column: col.name,
          rowIndex: ctx.rowIndex,
          originalValue: value,
          proposedValue: value,
          status: "error",
          confidence: 1,
          source: "email-format",
          reason: "Ongeldig e-mailadres",
          requiresApproval: false,
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
    const col = ctx.templateSchema.columns.find((c) => c.dataType === "phone");
    if (!col) return [];
    const value = ctx.values[col.name]?.trim() ?? "";
    if (!value) return [];
    if (!isValidPhone(value)) {
      return [
        {
          column: col.name,
          rowIndex: ctx.rowIndex,
          originalValue: value,
          proposedValue: value,
          status: "needs_review",
          confidence: 0.5,
          source: "phone-format",
          reason: "Telefoonnummer voldoet niet aan NL-formaat",
          requiresApproval: false,
        },
      ];
    }
    return [];
  },
};

function rowHash(values: Record<string, string>): string {
  const keys = ["Naam", "Adres", "Postcode"];
  return keys.map((k) => values[k]?.toLowerCase().trim() ?? "").join("|");
}

export function createDuplicateRowsRule(): ValidationRule {
  const seen = new Map<string, number[]>();
  return {
    id: "duplicate-rows",
    name: "Dubbele records",
    validate(ctx) {
      const hash = rowHash(ctx.values);
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
            requiresApproval: false,
          },
        ];
      }
      return [];
    },
  };
}

export const columnMismatchRule: ValidationRule = {
  id: "column-mismatch",
  name: "Kolomafwijking",
  validate() {
    return [];
  },
};

export const validationRules: ValidationRule[] = [
  requiredFieldsRule,
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

export function worstStatus(
  statuses: CorrectionStatus[]
): CorrectionStatus {
  const priority: CorrectionStatus[] = [
    "error",
    "ambiguous",
    "needs_review",
    "missing_data",
    "corrected",
    "valid",
  ];
  for (const p of priority) {
    if (statuses.includes(p)) return p;
  }
  return "valid";
}

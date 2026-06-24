import type { CorrectionStatus, ProposedCorrection, TemplateColumnSchema } from "@/types";

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

export function worstStatus(statuses: CorrectionStatus[]): CorrectionStatus {
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

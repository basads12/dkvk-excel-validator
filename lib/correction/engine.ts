import type { ProposedCorrection, RowStatus, TemplateColumnSchema } from "@/types";
import { defaultAddressProvider } from "@/lib/address";
import { applyAddressCorrections } from "@/lib/correction/address-corrections";
import {
  runValidationRules,
  validationRules,
  worstStatus,
} from "@/lib/validation/rules";
import { duplicateCorrectionForRow } from "@/lib/validation/duplicates";
import { normalizeRowValues } from "@/lib/validation/normalize";

export interface ProcessedRowResult {
  rowIndex: number;
  rowData: Record<string, string>;
  status: RowStatus;
  corrections: ProposedCorrection[];
}

export async function processRowWithAddressValidation(
  rowIndex: number,
  rawValues: Record<string, string>,
  templateSchema: TemplateColumnSchema,
  duplicateFirstIndex?: number
): Promise<ProcessedRowResult> {
  const values = normalizeRowValues(rawValues);

  const corrections: ProposedCorrection[] = runValidationRules(
    { rowIndex, values, templateSchema, allRows: [] },
    validationRules
  );

  if (duplicateFirstIndex !== undefined) {
    const dup = duplicateCorrectionForRow(
      rowIndex,
      values,
      new Map([[rowIndex, duplicateFirstIndex]])
    );
    if (dup) corrections.push(dup);
  }

  const addressCorrections = await applyAddressCorrections(
    rowIndex,
    values,
    defaultAddressProvider
  );
  corrections.push(...addressCorrections);

  const status = worstStatus(
    corrections.length > 0 ? corrections.map((c) => c.status) : ["valid"]
  ) as RowStatus;

  // Nooit automatisch invullen — alles wacht op handmatige goedkeuring
  return { rowIndex, rowData: values, status, corrections };
}

export { HIGH_CONFIDENCE_THRESHOLD } from "@/lib/address/types";

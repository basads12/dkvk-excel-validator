import type { ProposedCorrection, RowStatus, TemplateColumnSchema } from "@/types";
import { defaultAddressProvider } from "@/lib/address/mock-provider";
import {
  HIGH_CONFIDENCE_THRESHOLD,
  type AddressValidationProvider,
} from "@/lib/address/types";
import {
  runValidationRules,
  validationRules,
  worstStatus,
} from "@/lib/validation/rules";
import { duplicateCorrectionForRow } from "@/lib/validation/duplicates";
import { getRowValue } from "@/lib/template/columns";
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
    const dup = duplicateCorrectionForRow(rowIndex, values, new Map([[rowIndex, duplicateFirstIndex]]));
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

  const rowData = { ...values };
  for (const c of corrections) {
    if (
      c.status === "corrected" &&
      c.confidence >= HIGH_CONFIDENCE_THRESHOLD &&
      !c.requiresApproval
    ) {
      rowData[c.column] = c.proposedValue;
    }
  }

  return { rowIndex, rowData, status, corrections };
}

async function applyAddressCorrections(
  rowIndex: number,
  values: Record<string, string>,
  provider: AddressValidationProvider
): Promise<ProposedCorrection[]> {
  const street = getRowValue(values, "Adres");
  const houseNumber = getRowValue(values, "Nummer", "Huisnummer");
  const postcode = getRowValue(values, "Postcode");
  const city = getRowValue(values, "Woonplaats");

  const corrections: ProposedCorrection[] = [];
  const input = { street, houseNumber, postcode, city };

  if (street) {
    const suggestions = await provider.suggestCorrections(input);
    const streetSuggestions = suggestions.filter(
      (s) => s.street.toLowerCase() !== street.toLowerCase()
    );

    if (streetSuggestions.length === 1) {
      const s = streetSuggestions[0]!;
      if (s.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
        corrections.push({
          column: "Adres",
          rowIndex,
          originalValue: street,
          proposedValue: s.street,
          status: "corrected",
          confidence: s.confidence,
          source: s.source,
          reason: "Straatnaam gecorrigeerd op basis van betrouwbare bron",
          requiresApproval: true,
        });
      }
    } else if (streetSuggestions.length > 1) {
      corrections.push({
        column: "Adres",
        rowIndex,
        originalValue: street,
        proposedValue: street,
        status: "ambiguous",
        confidence: 0.5,
        source: "mock-pdok",
        reason: `Meerdere straatnamen mogelijk: ${streetSuggestions.map((s) => s.street).join(", ")}`,
        requiresApproval: false,
      });
    }
  }

  const missingPostcode = !postcode.trim();
  const missingCity = !city.trim();
  if (missingPostcode || missingCity) {
    const enrichment = await provider.enrichMissingFields(input);

    if (enrichment.ambiguous) {
      if (missingPostcode) {
        corrections.push({
          column: "Postcode",
          rowIndex,
          originalValue: "",
          proposedValue: "",
          status: "ambiguous",
          confidence: enrichment.confidence,
          source: enrichment.source,
          reason: "Meerdere postcodes mogelijk — handmatige controle vereist",
          requiresApproval: false,
        });
      }
      if (missingCity) {
        corrections.push({
          column: "Woonplaats",
          rowIndex,
          originalValue: "",
          proposedValue: "",
          status: "ambiguous",
          confidence: enrichment.confidence,
          source: enrichment.source,
          reason: "Meerdere plaatsen mogelijk — handmatige controle vereist",
          requiresApproval: false,
        });
      }
    } else if (enrichment.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
      if (missingPostcode && enrichment.fields.postcode) {
        corrections.push({
          column: "Postcode",
          rowIndex,
          originalValue: "",
          proposedValue: enrichment.fields.postcode,
          status: "corrected",
          confidence: enrichment.confidence,
          source: enrichment.source,
          reason: "Postcode aangevuld op basis van straat/huisnummer/plaats",
          requiresApproval: true,
        });
      }
      if (missingCity && enrichment.fields.city) {
        corrections.push({
          column: "Woonplaats",
          rowIndex,
          originalValue: "",
          proposedValue: enrichment.fields.city,
          status: "corrected",
          confidence: enrichment.confidence,
          source: enrichment.source,
          reason: "Plaats aangevuld op basis van postcode/huisnummer",
          requiresApproval: true,
        });
      }
    } else {
      if (missingPostcode) {
        corrections.push({
          column: "Postcode",
          rowIndex,
          originalValue: "",
          proposedValue: "",
          status: "missing_data",
          confidence: 0,
          source: enrichment.source,
          reason: "Ontbrekende postcode — geen betrouwbare bron gevonden",
          requiresApproval: false,
        });
      }
      if (missingCity) {
        corrections.push({
          column: "Woonplaats",
          rowIndex,
          originalValue: "",
          proposedValue: "",
          status: "missing_data",
          confidence: 0,
          source: enrichment.source,
          reason: "Ontbrekende plaats — geen betrouwbare bron gevonden",
          requiresApproval: false,
        });
      }
    }
  }

  return corrections;
}

export { HIGH_CONFIDENCE_THRESHOLD };

import type { ProposedCorrection } from "@/types";
import type { AddressInput, AddressValidationProvider } from "@/lib/address/types";
import { HIGH_CONFIDENCE_THRESHOLD } from "@/lib/address/types";
import { getRowValue } from "@/lib/template/columns";
import { normalizeCompare } from "@/lib/validation/format";
import { normalizePostcode } from "@/lib/validation/normalize";

function pushFieldCorrection(
  corrections: ProposedCorrection[],
  opts: {
    column: string;
    rowIndex: number;
    originalValue: string;
    proposedValue: string;
    confidence: number;
    source: string;
    reason: string;
  }
) {
  if (normalizeCompare(opts.originalValue) === normalizeCompare(opts.proposedValue)) {
    return;
  }
  if (
    opts.column === "Postcode" &&
    normalizePostcode(opts.originalValue) === normalizePostcode(opts.proposedValue)
  ) {
    return;
  }

  corrections.push({
    column: opts.column,
    rowIndex: opts.rowIndex,
    originalValue: opts.originalValue,
    proposedValue: opts.proposedValue,
    status: "needs_review",
    confidence: opts.confidence,
    source: opts.source,
    reason: opts.reason,
    requiresApproval: true,
  });
}

export async function applyAddressCorrections(
  rowIndex: number,
  values: Record<string, string>,
  provider: AddressValidationProvider
): Promise<ProposedCorrection[]> {
  const street = getRowValue(values, "Adres");
  const houseNumber = getRowValue(values, "Nummer", "Huisnummer");
  const postcode = getRowValue(values, "Postcode");
  const city = getRowValue(values, "Woonplaats");

  const corrections: ProposedCorrection[] = [];
  const input: AddressInput = { street, houseNumber, postcode, city };

  const hasAddressData = street || postcode || city || houseNumber;
  if (!hasAddressData) return corrections;

  // Volledige adrescontrole via PDOK wanneer genoeg gegevens aanwezig
  if (street && houseNumber && (postcode || city)) {
    const validation = await provider.validateAddress(input);

    if (validation.normalized && validation.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
      const n = validation.normalized;

      if (n.street && street) {
        pushFieldCorrection(corrections, {
          column: "Adres",
          rowIndex,
          originalValue: street,
          proposedValue: n.street,
          confidence: validation.confidence,
          source: validation.source,
          reason: `Controleer straatnaam. PDOK voorstel: "${n.street}"`,
        });
      }

      if (n.city && city) {
        pushFieldCorrection(corrections, {
          column: "Woonplaats",
          rowIndex,
          originalValue: city,
          proposedValue: n.city,
          confidence: validation.confidence,
          source: validation.source,
          reason: `Controleer plaatsnaam. PDOK voorstel: "${n.city}"`,
        });
      }

      if (n.postcode && postcode) {
        pushFieldCorrection(corrections, {
          column: "Postcode",
          rowIndex,
          originalValue: postcode,
          proposedValue: n.postcode,
          confidence: validation.confidence,
          source: validation.source,
          reason: `Controleer postcode. PDOK voorstel: "${n.postcode}"`,
        });
      }

      if (
        n.houseNumber &&
        houseNumber &&
        normalizeCompare(n.houseNumber) !== normalizeCompare(houseNumber)
      ) {
        pushFieldCorrection(corrections, {
          column: "Nummer",
          rowIndex,
          originalValue: houseNumber,
          proposedValue: n.houseNumber,
          confidence: validation.confidence,
          source: validation.source,
          reason: `Controleer huisnummer. PDOK voorstel: "${n.houseNumber}"`,
        });
      }
    } else if (!validation.valid && street && houseNumber) {
      corrections.push({
        column: "Adres",
        rowIndex,
        originalValue: street,
        proposedValue: street,
        status: "needs_review",
        confidence: validation.confidence,
        source: validation.source,
        reason:
          "Adres niet gevonden of onduidelijk in PDOK — handmatig controleren",
        requiresApproval: true,
      });
    }
  }

  // Straatcorrectie via suggesties (typo's)
  if (street) {
    const suggestions = await provider.suggestCorrections(input);
    const streetSuggestions = suggestions.filter(
      (s) => s.street.toLowerCase() !== street.toLowerCase()
    );

    const alreadyStreet = corrections.some((c) => c.column === "Adres");

    if (!alreadyStreet && streetSuggestions.length === 1) {
      const s = streetSuggestions[0]!;
      if (s.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
        pushFieldCorrection(corrections, {
          column: "Adres",
          rowIndex,
          originalValue: street,
          proposedValue: s.street,
          confidence: s.confidence,
          source: s.source,
          reason: `Controleer straatnaam. PDOK voorstel: "${s.street}"`,
        });
      }
    } else if (!alreadyStreet && streetSuggestions.length > 1) {
      corrections.push({
        column: "Adres",
        rowIndex,
        originalValue: street,
        proposedValue: streetSuggestions[0]!.street,
        status: "needs_review",
        confidence: 0.5,
        source: streetSuggestions[0]?.source ?? "pdok-locatieserver",
        reason: `Meerdere straatnamen mogelijk: ${streetSuggestions
          .slice(0, 3)
          .map((s) => s.street)
          .join(", ")}`,
        requiresApproval: true,
      });
    }
  }

  // Ontbrekende velden aanvullen
  const missingPostcode = !postcode.trim();
  const missingCity = !city.trim();

  if (missingPostcode || missingCity) {
    const enrichment = await provider.enrichMissingFields(input);

    if (enrichment.ambiguous) {
      if (missingPostcode) {
        const best = enrichment.suggestions[0]?.postcode ?? "";
        corrections.push({
          column: "Postcode",
          rowIndex,
          originalValue: "",
          proposedValue: best,
          status: "needs_review",
          confidence: enrichment.confidence,
          source: enrichment.source,
          reason: `Meerdere postcodes mogelijk — controleer voorstel${best ? `: "${best}"` : ""}`,
          requiresApproval: true,
        });
      }
      if (missingCity) {
        const best = enrichment.suggestions[0]?.city ?? "";
        corrections.push({
          column: "Woonplaats",
          rowIndex,
          originalValue: "",
          proposedValue: best,
          status: "needs_review",
          confidence: enrichment.confidence,
          source: enrichment.source,
          reason: `Meerdere plaatsen mogelijk — controleer voorstel${best ? `: "${best}"` : ""}`,
          requiresApproval: true,
        });
      }
    } else if (
      enrichment.confidence >= HIGH_CONFIDENCE_THRESHOLD &&
      enrichment.suggestions.length > 0
    ) {
      if (missingPostcode && enrichment.fields.postcode) {
        corrections.push({
          column: "Postcode",
          rowIndex,
          originalValue: "",
          proposedValue: enrichment.fields.postcode,
          status: "needs_review",
          confidence: enrichment.confidence,
          source: enrichment.source,
          reason: `Controleer ontbrekende postcode. PDOK voorstel: "${enrichment.fields.postcode}"`,
          requiresApproval: true,
        });
      }
      if (missingCity && enrichment.fields.city) {
        corrections.push({
          column: "Woonplaats",
          rowIndex,
          originalValue: "",
          proposedValue: enrichment.fields.city,
          status: "needs_review",
          confidence: enrichment.confidence,
          source: enrichment.source,
          reason: `Controleer ontbrekende plaats. PDOK voorstel: "${enrichment.fields.city}"`,
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

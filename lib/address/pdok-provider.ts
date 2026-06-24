import {
  docsToSuggestions,
  filterRelevantDocs,
  matchesInput,
  searchPdok,
} from "./pdok-client";
import type {
  AddressEnrichmentResult,
  AddressInput,
  AddressSuggestion,
  AddressValidationProvider,
  AddressValidationResult,
} from "./types";

const SOURCE = "pdok-locatieserver";

export class PdokAddressValidationProvider implements AddressValidationProvider {
  async validateAddress(input: AddressInput): Promise<AddressValidationResult> {
    if (!input.street && !input.postcode && !input.city && !input.houseNumber) {
      return { valid: false, confidence: 0, source: SOURCE };
    }

    const { docs, maxScore } = await searchPdok(input);
    const relevant = filterRelevantDocs(docs, input);
    const exactMatches = relevant.filter((doc) => matchesInput(doc, input));

    if (exactMatches.length === 1) {
      const suggestion = docsToSuggestions(exactMatches, maxScore)[0]!;
      return {
        valid: true,
        confidence: suggestion.confidence,
        normalized: {
          street: suggestion.street,
          houseNumber: suggestion.houseNumber,
          postcode: suggestion.postcode,
          city: suggestion.city,
        },
        source: SOURCE,
      };
    }

    if (exactMatches.length > 1) {
      return { valid: false, confidence: 0.5, source: SOURCE };
    }

    const top = docsToSuggestions(relevant.slice(0, 1), maxScore)[0];
    if (top && relevant.length === 1) {
      return {
        valid: true,
        confidence: top.confidence,
        normalized: {
          street: top.street,
          houseNumber: top.houseNumber,
          postcode: top.postcode,
          city: top.city,
        },
        source: SOURCE,
      };
    }

    return {
      valid: false,
      confidence: relevant.length > 1 ? 0.5 : 0,
      source: SOURCE,
    };
  }

  async suggestCorrections(input: AddressInput): Promise<AddressSuggestion[]> {
    if (!input.street && !input.postcode && !input.city) return [];

    const { docs, maxScore } = await searchPdok(input, 15);
    const relevant = filterRelevantDocs(docs, {
      ...input,
      street: undefined, // zoek breder voor straatcorrecties
    });

    const suggestions = docsToSuggestions(relevant, maxScore);

    if (!input.street) return suggestions;

    const inputStreet = input.street.trim().toLowerCase();
    return suggestions.filter(
      (s) => s.street.toLowerCase() !== inputStreet
    );
  }

  async enrichMissingFields(
    input: AddressInput
  ): Promise<AddressEnrichmentResult> {
    const needsData =
      !input.postcode?.trim() ||
      !input.city?.trim() ||
      !input.street?.trim();

    if (!needsData) {
      return {
        fields: {},
        confidence: 0,
        source: SOURCE,
        ambiguous: false,
        suggestions: [],
      };
    }

    if (!input.street && !input.postcode && !input.houseNumber) {
      return {
        fields: {},
        confidence: 0,
        source: SOURCE,
        ambiguous: false,
        suggestions: [],
      };
    }

    const { docs, maxScore } = await searchPdok(input, 15);
    const relevant = filterRelevantDocs(docs, input);
    const suggestions = docsToSuggestions(relevant, maxScore);

    if (suggestions.length === 0) {
      return {
        fields: {},
        confidence: 0,
        source: SOURCE,
        ambiguous: false,
        suggestions: [],
      };
    }

    if (suggestions.length > 1) {
      const uniqueStreets = new Set(suggestions.map((s) => s.street));
      const uniquePostcodes = new Set(suggestions.map((s) => s.postcode));
      const uniqueCities = new Set(suggestions.map((s) => s.city));

      const ambiguous =
        (!input.postcode && uniquePostcodes.size > 1) ||
        (!input.city && uniqueCities.size > 1) ||
        (!input.street && uniqueStreets.size > 1);

      if (ambiguous) {
        return {
          fields: {},
          confidence: 0.5,
          source: SOURCE,
          ambiguous: true,
          suggestions: suggestions.slice(0, 5),
        };
      }
    }

    const match = suggestions[0]!;
    const fields: Partial<AddressInput> = {};

    if (!input.street?.trim() && match.street) fields.street = match.street;
    if (!input.postcode?.trim() && match.postcode)
      fields.postcode = match.postcode;
    if (!input.city?.trim() && match.city) fields.city = match.city;
    if (!input.houseNumber?.trim() && match.houseNumber)
      fields.houseNumber = match.houseNumber;

    if (Object.keys(fields).length === 0) {
      return {
        fields: {},
        confidence: 0,
        source: SOURCE,
        ambiguous: false,
        suggestions: [],
      };
    }

    return {
      fields,
      confidence: match.confidence,
      source: SOURCE,
      ambiguous: false,
      suggestions: [match],
    };
  }
}

export const pdokAddressProvider = new PdokAddressValidationProvider();

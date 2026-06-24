/**
 * MOCK ADDRESS PROVIDER
 * TODO: Vervangen door een echte bron (PDOK Locatieserver, BAG API, of PostNL).
 * Bevat alleen vaste testadressen — genereert NOOIT willekeurige data.
 */
import type {
  AddressEnrichmentResult,
  AddressInput,
  AddressSuggestion,
  AddressValidationProvider,
  AddressValidationResult,
} from "./types";

const MOCK_ADDRESSES: AddressSuggestion[] = [
  {
    street: "Oudegracht",
    houseNumber: "123",
    postcode: "3511 AB",
    city: "Utrecht",
    confidence: 0.99,
    source: "mock-pdok",
  },
  {
    street: "Damrak",
    houseNumber: "1",
    postcode: "1012 LG",
    city: "Amsterdam",
    confidence: 0.99,
    source: "mock-pdok",
  },
  {
    street: "Coolsingel",
    houseNumber: "40",
    postcode: "3011 AD",
    city: "Rotterdam",
    confidence: 0.99,
    source: "mock-pdok",
  },
  {
    street: "Grote Markt",
    houseNumber: "5",
    postcode: "9712 HN",
    city: "Groningen",
    confidence: 0.98,
    source: "mock-pdok",
  },
];

function normalize(s?: string): string {
  return (s ?? "").trim().toLowerCase();
}

function findMatches(input: AddressInput): AddressSuggestion[] {
  return MOCK_ADDRESSES.filter((addr) => {
    const streetMatch =
      !input.street ||
      normalize(addr.street).includes(normalize(input.street)) ||
      normalize(input.street).includes(normalize(addr.street).slice(0, 4));
    const pcMatch =
      !input.postcode ||
      normalize(addr.postcode).replace(/\s/g, "") ===
        normalize(input.postcode).replace(/\s/g, "");
    const cityMatch =
      !input.city ||
      normalize(addr.city) === normalize(input.city) ||
      normalize(addr.city).startsWith(normalize(input.city).slice(0, 3));
    const hnMatch =
      !input.houseNumber || normalize(addr.houseNumber) === normalize(input.houseNumber);

    return streetMatch && pcMatch && cityMatch && hnMatch;
  });
}

export class MockAddressValidationProvider implements AddressValidationProvider {
  async validateAddress(input: AddressInput): Promise<AddressValidationResult> {
    const matches = findMatches(input);
    if (matches.length === 1) {
      const m = matches[0]!;
      return {
        valid: true,
        confidence: m.confidence,
        normalized: {
          street: m.street,
          houseNumber: m.houseNumber,
          postcode: m.postcode,
          city: m.city,
        },
        source: m.source,
      };
    }
    return {
      valid: false,
      confidence: matches.length > 1 ? 0.5 : 0,
      source: "mock-pdok",
    };
  }

  async suggestCorrections(input: AddressInput): Promise<AddressSuggestion[]> {
    if (!input.street && !input.postcode && !input.city) return [];

    const matches = MOCK_ADDRESSES.filter((addr) => {
      if (input.postcode) {
        return (
          normalize(addr.postcode).replace(/\s/g, "") ===
          normalize(input.postcode).replace(/\s/g, "")
        );
      }
      if (input.street) {
        const typo = normalize(input.street);
        const correct = normalize(addr.street);
        return (
          correct.includes(typo.slice(0, 4)) ||
          levenshtein(typo, correct) <= 2
        );
      }
      return false;
    });

    return matches;
  }

  async enrichMissingFields(input: AddressInput): Promise<AddressEnrichmentResult> {
    const suggestions = await this.suggestCorrections(input);

    if (suggestions.length === 0) {
      return {
        fields: {},
        confidence: 0,
        source: "mock-pdok",
        ambiguous: false,
        suggestions: [],
      };
    }

    if (suggestions.length > 1) {
      return {
        fields: {},
        confidence: 0.5,
        source: "mock-pdok",
        ambiguous: true,
        suggestions,
      };
    }

    const match = suggestions[0]!;
    const fields: Partial<AddressInput> = {};

    if (!input.street && match.street) fields.street = match.street;
    if (!input.postcode && match.postcode) fields.postcode = match.postcode;
    if (!input.city && match.city) fields.city = match.city;
    if (!input.houseNumber && match.houseNumber)
      fields.houseNumber = match.houseNumber;

    return {
      fields,
      confidence: match.confidence,
      source: match.source,
      ambiguous: false,
      suggestions: [match],
    };
  }
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost
      );
    }
  }
  return matrix[a.length]![b.length]!;
}


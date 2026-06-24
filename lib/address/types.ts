export interface AddressInput {
  street?: string;
  houseNumber?: string;
  postcode?: string;
  city?: string;
}

export interface AddressSuggestion {
  street: string;
  houseNumber: string;
  postcode: string;
  city: string;
  confidence: number;
  source: string;
}

export interface AddressValidationResult {
  valid: boolean;
  confidence: number;
  normalized?: AddressInput;
  source: string;
}

export interface AddressEnrichmentResult {
  fields: Partial<AddressInput>;
  confidence: number;
  source: string;
  ambiguous: boolean;
  suggestions: AddressSuggestion[];
}

export interface AddressValidationProvider {
  validateAddress(input: AddressInput): Promise<AddressValidationResult>;
  suggestCorrections(input: AddressInput): Promise<AddressSuggestion[]>;
  enrichMissingFields(input: AddressInput): Promise<AddressEnrichmentResult>;
}

export const HIGH_CONFIDENCE_THRESHOLD = 0.95;

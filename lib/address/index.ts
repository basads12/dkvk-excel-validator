import { MockAddressValidationProvider } from "./mock-provider";
import { PdokAddressValidationProvider } from "./pdok-provider";

export function createAddressProvider() {
  if (process.env.ADDRESS_PROVIDER === "mock") {
    return new MockAddressValidationProvider();
  }
  return new PdokAddressValidationProvider();
}

export const defaultAddressProvider = createAddressProvider();

export { HIGH_CONFIDENCE_THRESHOLD } from "./types";
export type {
  AddressEnrichmentResult,
  AddressInput,
  AddressSuggestion,
  AddressValidationProvider,
  AddressValidationResult,
} from "./types";

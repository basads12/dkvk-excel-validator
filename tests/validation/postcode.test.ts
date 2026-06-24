import { describe, expect, it } from "vitest";
import {
  isValidDutchPostcode,
  normalizePostcode,
} from "@/lib/validation/normalize";

describe("postcode validation", () => {
  it("accepts valid Dutch postcodes", () => {
    expect(isValidDutchPostcode("3511 AB")).toBe(true);
    expect(isValidDutchPostcode("3511AB")).toBe(true);
  });

  it("rejects invalid postcodes", () => {
    expect(isValidDutchPostcode("123")).toBe(false);
    expect(isValidDutchPostcode("ABCD EF")).toBe(false);
  });

  it("normalizes postcode format", () => {
    expect(normalizePostcode("3511ab")).toBe("3511 AB");
  });
});

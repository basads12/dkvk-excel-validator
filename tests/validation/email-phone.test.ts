import { describe, expect, it } from "vitest";
import {
  isValidEmail,
  isValidPhone,
} from "@/lib/validation/normalize";

describe("email validation", () => {
  it("accepts valid emails", () => {
    expect(isValidEmail("test@dekunstvankunst.nl")).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
  });

  it("allows empty email", () => {
    expect(isValidEmail("")).toBe(true);
  });
});

describe("phone validation", () => {
  it("accepts Dutch phone numbers", () => {
    expect(isValidPhone("0612345678")).toBe(true);
    expect(isValidPhone("+31612345678")).toBe(true);
  });

  it("rejects invalid phone numbers", () => {
    expect(isValidPhone("123")).toBe(false);
  });

  it("allows empty phone", () => {
    expect(isValidPhone("")).toBe(true);
  });
});

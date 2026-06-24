import { describe, expect, it } from "vitest";
import { findDuplicateRowIndexes } from "@/lib/validation/duplicates";

describe("duplicate rows", () => {
  it("detects duplicate rows by naam+adres+postcode", () => {
    const rows = [
      { Naam: "Jan", Adres: "Straat", Postcode: "1234 AB" },
      { Naam: "Piet", Adres: "Andere", Postcode: "5678 CD" },
      { Naam: "Jan", Adres: "Straat", Postcode: "1234 AB" },
    ];

    const dupes = findDuplicateRowIndexes(rows);
    expect(dupes.get(2)).toBe(0);
    expect(dupes.has(0)).toBe(false);
  });

  it("ignores empty rows", () => {
    const rows = [
      { Naam: "", Adres: "", Postcode: "" },
      { Naam: "", Adres: "", Postcode: "" },
    ];
    expect(findDuplicateRowIndexes(rows).size).toBe(0);
  });
});

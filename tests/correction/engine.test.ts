import { describe, expect, it } from "vitest";
import { HIGH_CONFIDENCE_THRESHOLD } from "@/lib/address/types";
import { processRowWithAddressValidation } from "@/lib/correction/engine";
import { DEFAULT_TEMPLATE_SCHEMA } from "@/types";

describe("correction engine", () => {
  it("does not auto-correct street with low confidence", async () => {
    const result = await processRowWithAddressValidation(
      0,
      { Naam: "Test", Adres: "Onbekende Straat", Nummer: "99", Postcode: "9999 ZZ", Woonplaats: "Nergens" },
      DEFAULT_TEMPLATE_SCHEMA
    );

    const streetCorrection = result.corrections.find((c) => c.column === "Adres");
    if (streetCorrection) {
      expect(streetCorrection.confidence).toBeLessThan(HIGH_CONFIDENCE_THRESHOLD);
    }
  });

  it("marks missing required fields", async () => {
    const result = await processRowWithAddressValidation(
      0,
      { Naam: "Test", Adres: "", Nummer: "", Postcode: "", Woonplaats: "" },
      DEFAULT_TEMPLATE_SCHEMA
    );

    expect(result.status).toBe("missing_data");
    expect(result.corrections.some((c) => c.status === "missing_data")).toBe(true);
  });

  it("never invents postcode without reliable source", async () => {
    const result = await processRowWithAddressValidation(
      0,
      { Naam: "Test", Adres: "Randomweg", Nummer: "1", Postcode: "", Woonplaats: "Onbekend" },
      DEFAULT_TEMPLATE_SCHEMA
    );

    const pcCorrection = result.corrections.find((c) => c.column === "Postcode");
    if (pcCorrection?.proposedValue) {
      expect(pcCorrection.requiresApproval).toBe(true);
    } else {
      expect(
        pcCorrection?.status === "missing_data" || pcCorrection?.status === "ambiguous"
      ).toBe(true);
    }
  });
});

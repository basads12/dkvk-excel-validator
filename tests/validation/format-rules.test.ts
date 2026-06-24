import { describe, expect, it } from "vitest";
import {
  formatDutchName,
  formatPhoneDisplay,
  splitAanhefFromNaam,
  suggestAanhef,
  suggestEmail,
} from "@/lib/validation/format";
import { aanhefRule, naamRule } from "@/lib/validation/rules/aanhef-naam";
import { DEFAULT_TEMPLATE_SCHEMA } from "@/types";

describe("aanhef formatting", () => {
  it("normalizes mevr to Mevr.", () => {
    expect(suggestAanhef("mevr")).toBe("Mevr.");
    expect(suggestAanhef("MEVR.")).toBe("Mevr.");
    expect(suggestAanhef("fam")).toBe("Fam.");
  });

  it("splits aanhef from naam field", () => {
    const split = splitAanhefFromNaam("Mevr. Jansen");
    expect(split?.aanhef).toBe("Mevr.");
    expect(split?.rest).toBe("Jansen");
  });
});

describe("naam formatting", () => {
  it("title-cases ALL CAPS names", () => {
    expect(formatDutchName("JAN JANSEN")).toBe("Jan Jansen");
    expect(formatDutchName("PIET VAN DER BERG")).toBe("Piet van der Berg");
  });
});

describe("contact formatting", () => {
  it("normalizes email", () => {
    expect(suggestEmail("  Test@Example.COM ")).toBe("test@example.com");
  });

  it("formats mobile numbers", () => {
    expect(formatPhoneDisplay("0612345678")).toBe("06-12345678");
  });
});

describe("aanhef rule", () => {
  it("proposes aanhef correction with manual review", () => {
    const corrections = aanhefRule.validate({
      rowIndex: 0,
      values: { Aanhef: "mevr", Naam: "Jansen" },
      templateSchema: DEFAULT_TEMPLATE_SCHEMA,
      allRows: [],
    });
    expect(corrections[0]?.proposedValue).toBe("Mevr.");
    expect(corrections[0]?.requiresApproval).toBe(true);
    expect(corrections[0]?.status).toBe("needs_review");
  });
});

describe("naam rule", () => {
  it("proposes splitting mevr from naam with approval", () => {
    const corrections = naamRule.validate({
      rowIndex: 0,
      values: { Aanhef: "", Naam: "Mevr. Jansen" },
      templateSchema: DEFAULT_TEMPLATE_SCHEMA,
      allRows: [],
    });
    expect(corrections.some((c) => c.column === "Aanhef" && c.proposedValue === "Mevr.")).toBe(true);
    expect(corrections.some((c) => c.column === "Naam" && c.proposedValue === "Jansen")).toBe(true);
    expect(corrections.every((c) => c.requiresApproval)).toBe(true);
  });
});

import { describe, expect, it, vi, afterEach } from "vitest";
import {
  buildPdokQuery,
  docToSuggestion,
  docsToSuggestions,
  filterRelevantDocs,
  formatHouseNumber,
  parseHouseNumberForFilter,
} from "@/lib/address/pdok-client";
import { normalizePostcode } from "@/lib/validation/normalize";
import { PdokAddressValidationProvider } from "@/lib/address/pdok-provider";

describe("pdok client", () => {
  it("formats house number with suffix", () => {
    expect(
      formatHouseNumber({
        huisnummer: 123,
        huisnummertoevoeging: "A",
      })
    ).toBe("123-A");
  });

  it("builds query with filters", () => {
    const q = buildPdokQuery({
      street: "Oudegracht",
      houseNumber: "123",
      city: "Utrecht",
    });
    expect(q.q).toContain("Oudegracht");
    expect(q.fq).toContain("type:adres");
    expect(q.fq).toContain("huisnummer:123");
  });

  it("puts alphanumeric house numbers in q, not fq", () => {
    const q = buildPdokQuery({
      street: "Hoofdstraat",
      houseNumber: "12a",
      city: "Amsterdam",
    });
    expect(q.fq).toContain("huisnummer:12");
    expect(q.q).toContain("12a");
    expect(q.fq.some((f) => f.includes("12a"))).toBe(false);
  });

  it("does not add invalid huisnummer fq for text-only values", () => {
    expect(parseHouseNumberForFilter("nvt")).toBeNull();
    const q = buildPdokQuery({
      street: "Hoofdstraat",
      houseNumber: "nvt",
      city: "Utrecht",
    });
    expect(q.fq.some((f) => f.startsWith("huisnummer:"))).toBe(false);
    expect(q.q).toContain("nvt");
  });

  it("filters docs by city and house number", () => {
    const docs = [
      {
        straatnaam: "Oudegracht",
        huisnummer: 123,
        postcode: "3511AH",
        woonplaatsnaam: "Utrecht",
        score: 14,
      },
      {
        straatnaam: "Oudegracht",
        huisnummer: 123,
        postcode: "1811CC",
        woonplaatsnaam: "Alkmaar",
        score: 11,
      },
    ];
    const filtered = filterRelevantDocs(docs, {
      street: "Oudegracht",
      houseNumber: "123",
      city: "Utrecht",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.woonplaatsnaam).toBe("Utrecht");
  });

  it("maps doc to suggestion with confidence", () => {
    const suggestion = docToSuggestion(
      {
        straatnaam: "Oudegracht",
        huisnummer: 123,
        postcode: "3511AH",
        woonplaatsnaam: "Utrecht",
        score: 14,
      },
      14
    );
    expect(suggestion.street).toBe("Oudegracht");
    expect(suggestion.postcode).toBe(normalizePostcode("3511AH"));
    expect(suggestion.confidence).toBeGreaterThan(0.95);
    expect(suggestion.source).toBe("pdok-locatieserver");
  });

  it("deduplicates suggestions", () => {
    const docs = [
      {
        straatnaam: "Oudegracht",
        huisnummer: 123,
        postcode: "3511AH",
        woonplaatsnaam: "Utrecht",
        score: 14,
      },
      {
        straatnaam: "Oudegracht",
        huisnummer: 123,
        postcode: "3511AH",
        woonplaatsnaam: "Utrecht",
        score: 14,
      },
    ];
    expect(docsToSuggestions(docs, 14)).toHaveLength(1);
  });
});

describe("pdok provider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("enriches missing postcode from PDOK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response: {
            maxScore: 14,
            docs: [
              {
                straatnaam: "Oudegracht",
                huisnummer: 123,
                postcode: "3511AH",
                woonplaatsnaam: "Utrecht",
                score: 14,
              },
            ],
          },
        }),
      })
    );

    const provider = new PdokAddressValidationProvider();
    const result = await provider.enrichMissingFields({
      street: "Oudegracht",
      houseNumber: "123",
      city: "Utrecht",
    });

    expect(result.fields.postcode).toBe("3511 AH");
    expect(result.confidence).toBeGreaterThan(0.95);
    expect(result.source).toBe("pdok-locatieserver");
    expect(result.ambiguous).toBe(false);
  });

  it("marks ambiguous when multiple postcodes found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response: {
            maxScore: 14,
            docs: [
              {
                straatnaam: "Oudegracht",
                huisnummer: 123,
                postcode: "3511AH",
                woonplaatsnaam: "Utrecht",
                score: 14,
              },
              {
                straatnaam: "Oudegracht aan de Werf",
                huisnummer: 123,
                postcode: "3511AL",
                woonplaatsnaam: "Utrecht",
                score: 12,
              },
            ],
          },
        }),
      })
    );

    const provider = new PdokAddressValidationProvider();
    const result = await provider.enrichMissingFields({
      street: "Oudegracht",
      houseNumber: "123",
      city: "Utrecht",
    });

    expect(result.ambiguous).toBe(true);
    expect(result.fields.postcode).toBeUndefined();
  });
});

import { normalizePostcode } from "@/lib/validation/normalize";
import type { AddressInput, AddressSuggestion } from "./types";

export const PDOK_FREE_URL =
  "https://api.pdok.nl/bzk/locatieserver/search/v3_1/free";

export interface PdokDoc {
  straatnaam?: string;
  huisnummer?: number;
  huisletter?: string;
  huisnummertoevoeging?: string;
  postcode?: string;
  woonplaatsnaam?: string;
  score?: number;
}

export interface PdokSearchResponse {
  response?: {
    numFound?: number;
    maxScore?: number;
    docs?: PdokDoc[];
  };
}

export function formatHouseNumber(doc: PdokDoc): string {
  const base = doc.huisnummer != null ? String(doc.huisnummer) : "";
  const letter = doc.huisletter?.trim() ?? "";
  const suffix = doc.huisnummertoevoeging?.trim() ?? "";
  if (!base) return "";
  if (letter) return `${base}${letter}`;
  if (suffix) return `${base}-${suffix}`;
  return base;
}

export function docToSuggestion(
  doc: PdokDoc,
  maxScore: number,
  source = "pdok-locatieserver"
): AddressSuggestion {
  const score = doc.score ?? 0;
  const confidence =
    maxScore > 0 ? Math.min(0.99, 0.85 + (score / maxScore) * 0.14) : 0.85;

  return {
    street: doc.straatnaam?.trim() ?? "",
    houseNumber: formatHouseNumber(doc),
    postcode: normalizePostcode(doc.postcode ?? ""),
    city: doc.woonplaatsnaam?.trim() ?? "",
    confidence,
    source,
  };
}

function normalizeText(value?: string): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizePostcodeKey(value?: string): string {
  return (value ?? "").replace(/\s/g, "").toUpperCase();
}

export function matchesInput(doc: PdokDoc, input: AddressInput): boolean {
  if (input.postcode) {
    if (
      normalizePostcodeKey(doc.postcode) !== normalizePostcodeKey(input.postcode)
    ) {
      return false;
    }
  }
  if (input.city) {
    const docCity = normalizeText(doc.woonplaatsnaam);
    const inputCity = normalizeText(input.city);
    if (docCity !== inputCity && !docCity.startsWith(inputCity.slice(0, 3))) {
      return false;
    }
  }
  if (input.houseNumber) {
    const docHn = normalizeText(formatHouseNumber(doc));
    const inputHn = normalizeText(input.houseNumber);
    if (docHn !== inputHn && docHn.split("-")[0] !== inputHn.split("-")[0]) {
      return false;
    }
  }
  if (input.street) {
    if (normalizeText(doc.straatnaam) !== normalizeText(input.street)) {
      return false;
    }
  }
  return true;
}

const PDOK_MAX_QUERY_LENGTH = 400;

/** Alleen puur numerieke huisnummers mogen in Solr fq=huisnummer (12a geeft 400). */
export function parseHouseNumberForFilter(
  houseNumber: string
): number | null {
  const trimmed = houseNumber.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d+)/);
  if (!match) return null;
  const num = parseInt(match[1]!, 10);
  return Number.isFinite(num) ? num : null;
}

export function buildPdokQuery(input: AddressInput): {
  q?: string;
  fq: string[];
} {
  const fq = ["type:adres"];
  const qParts: string[] = [];

  if (input.street) qParts.push(input.street.trim());
  if (input.houseNumber) {
    const hn = input.houseNumber.trim();
    const numeric = parseHouseNumberForFilter(hn);
    if (numeric !== null) {
      fq.push(`huisnummer:${numeric}`);
      if (hn !== String(numeric)) {
        qParts.push(hn);
      }
    } else {
      qParts.push(hn);
    }
  }
  if (input.postcode) {
    fq.push(`postcode:${normalizePostcodeKey(input.postcode)}`);
  }
  if (input.city) qParts.push(input.city.trim());

  const q =
    qParts.length > 0
      ? qParts.join(" ").slice(0, PDOK_MAX_QUERY_LENGTH)
      : undefined;

  return { q, fq };
}

export async function searchPdok(
  input: AddressInput,
  rows = 10
): Promise<{ docs: PdokDoc[]; maxScore: number }> {
  const { q, fq } = buildPdokQuery(input);
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  for (const filter of fq) params.append("fq", filter);
  params.set("rows", String(rows));
  params.set(
    "fl",
    "straatnaam,huisnummer,huisletter,huisnummertoevoeging,postcode,woonplaatsnaam,score"
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${PDOK_FREE_URL}?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      // Ongeldige invoer (bijv. rare huisnummers) — geen harde fout, rij gaat naar review
      if (res.status === 400) {
        return { docs: [], maxScore: 0 };
      }
      throw new Error(`PDOK API fout: ${res.status}`);
    }

    const data = (await res.json()) as PdokSearchResponse;
    return {
      docs: data.response?.docs ?? [],
      maxScore: data.response?.maxScore ?? 0,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function filterRelevantDocs(
  docs: PdokDoc[],
  input: AddressInput
): PdokDoc[] {
  if (docs.length === 0) return [];

  let filtered = docs;

  if (input.city) {
    const cityKey = normalizeText(input.city);
    const byCity = filtered.filter((d) => {
      const c = normalizeText(d.woonplaatsnaam);
      return c === cityKey || c.startsWith(cityKey.slice(0, 3));
    });
    if (byCity.length > 0) filtered = byCity;
  }

  if (input.postcode) {
    const pcKey = normalizePostcodeKey(input.postcode);
    const byPc = filtered.filter(
      (d) => normalizePostcodeKey(d.postcode) === pcKey
    );
    if (byPc.length > 0) filtered = byPc;
  }

  if (input.houseNumber) {
    const hn = normalizeText(input.houseNumber);
    const byHn = filtered.filter(
      (d) => normalizeText(formatHouseNumber(d)) === hn
    );
    if (byHn.length > 0) filtered = byHn;
  }

  return filtered;
}

export function docsToSuggestions(
  docs: PdokDoc[],
  maxScore: number
): AddressSuggestion[] {
  const seen = new Set<string>();
  const suggestions: AddressSuggestion[] = [];

  for (const doc of docs) {
    const suggestion = docToSuggestion(doc, maxScore);
    const key = [
      suggestion.street,
      suggestion.houseNumber,
      suggestion.postcode,
      suggestion.city,
    ]
      .join("|")
      .toLowerCase();
    if (seen.has(key) || !suggestion.street) continue;
    seen.add(key);
    suggestions.push(suggestion);
  }

  return suggestions;
}

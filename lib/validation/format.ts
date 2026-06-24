/** Gestandaardiseerde aanhefformaten */
export const CANONICAL_AANHEF: Record<string, string> = {
  dhr: "Dhr.",
  "dhr.": "Dhr.",
  "de heer": "Dhr.",
  heer: "Dhr.",
  mr: "Dhr.",
  "mr.": "Dhr.",
  mevr: "Mevr.",
  "mevr.": "Mevr.",
  mevrouw: "Mevr.",
  mevrouwe: "Mevr.",
  mvr: "Mevr.",
  "mvr.": "Mevr.",
  fam: "Fam.",
  "fam.": "Fam.",
  familie: "Fam.",
};

const AANHEF_IN_NAAM =
  /^(dhr\.?|de heer|mevr\.?|mevrouw(?:we)?|fam\.?|familie|mr\.?|mvr\.?)\s+(.+)$/i;

const LOWER_PARTICLES = new Set([
  "van",
  "de",
  "den",
  "der",
  "'t",
  "te",
  "ten",
  "ter",
  "op",
  "in",
  "het",
]);

export function normalizeAanhefKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function suggestAanhef(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const key = normalizeAanhefKey(trimmed);
  const canonical = CANONICAL_AANHEF[key];
  if (canonical) return canonical;

  // Alleen punt ontbreekt: "Mevr" -> "Mevr."
  for (const [alias, target] of Object.entries(CANONICAL_AANHEF)) {
    if (key === alias.replace(".", "")) return target;
  }

  return null;
}

export function isKnownAanhef(value: string): boolean {
  if (!value.trim()) return true;
  const key = normalizeAanhefKey(value);
  if (CANONICAL_AANHEF[key]) return true;
  return Object.values(CANONICAL_AANHEF).some(
    (v) => v.toLowerCase() === key
  );
}

export function splitAanhefFromNaam(
  naam: string
): { aanhef: string; rest: string } | null {
  const match = naam.trim().match(AANHEF_IN_NAAM);
  if (!match?.[1] || !match[2]?.trim()) return null;

  const suggested = suggestAanhef(match[1]);
  if (!suggested) return null;

  return { aanhef: suggested, rest: match[2].trim() };
}

function capitalizeWord(word: string): string {
  if (!word) return word;
  if (word.includes("-")) {
    return word
      .split("-")
      .map((part) => capitalizeWord(part))
      .join("-");
  }
  const lower = word.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function formatDutchName(name: string): string {
  const trimmed = name.replace(/\s+/g, " ").trim();
  if (!trimmed) return trimmed;

  const letters = trimmed.replace(/[^a-zA-ZÀ-ÿ]/g, "");
  const isAllCaps =
    letters.length > 2 && letters === letters.toUpperCase();
  const isAllLower =
    letters.length > 2 && letters === letters.toLowerCase();

  if (!isAllCaps && !isAllLower) return trimmed;

  return trimmed
    .split(" ")
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && LOWER_PARTICLES.has(lower)) return lower;
      return capitalizeWord(word);
    })
    .join(" ");
}

export function hasSuspiciousName(value: string): boolean {
  if (/\d/.test(value)) return true;
  if (/[^a-zA-ZÀ-ÿ\s.'\-]/.test(value)) return true;
  if (/\s{2,}/.test(value)) return true;
  return false;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

export function suggestEmail(value: string): string | null {
  const normalized = normalizeEmail(value);
  if (!normalized || normalized === value.trim()) return null;
  return normalized;
}

export function formatPhoneDisplay(value: string): string | null {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("31") && digits.length >= 11) {
    digits = "0" + digits.slice(2);
  }

  if (digits.startsWith("06") && digits.length === 10) {
    return `06-${digits.slice(2)}`;
  }

  if (digits.startsWith("0") && digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  if (digits.startsWith("0") && digits.length === 9) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }

  return null;
}

export function normalizeCompare(value: string): string {
  return value.trim().toLowerCase();
}

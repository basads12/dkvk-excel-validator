const DUTCH_POSTCODE_REGEX = /^\d{4}\s?[A-Z]{2}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(\+31|0)[1-9][0-9\s-]{7,12}$/;

export function normalizePostcode(value: string): string {
  const cleaned = value.replace(/\s/g, "").toUpperCase();
  if (cleaned.length === 6) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
  }
  return value.trim();
}

export function normalizePhone(value: string): string {
  return value.replace(/[^\d+]/g, "").trim();
}

export function isValidDutchPostcode(value: string): boolean {
  return DUTCH_POSTCODE_REGEX.test(normalizePostcode(value));
}

export function isValidEmail(value: string): boolean {
  if (!value.trim()) return true;
  return EMAIL_REGEX.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  if (!value.trim()) return true;
  const normalized = normalizePhone(value);
  return PHONE_REGEX.test(normalized);
}

export function normalizeRowValues(
  values: Record<string, string>
): Record<string, string> {
  const result = { ...values };
  for (const [key, val] of Object.entries(result)) {
    const k = key.toLowerCase();
    if (k.includes("postcode")) {
      result[key] = normalizePostcode(val);
    } else {
      result[key] = val.trim();
    }
  }
  return result;
}

export {
  DUTCH_POSTCODE_REGEX,
  EMAIL_REGEX,
  PHONE_REGEX,
};

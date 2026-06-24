import { z } from "zod";

export const ALLOWED_EMAIL_DOMAIN =
  process.env.ALLOWED_EMAIL_DOMAIN ?? "dekunstvankunst.nl";

export function isAllowedEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith(`@${ALLOWED_EMAIL_DOMAIN.toLowerCase()}`);
}

export const loginEmailSchema = z
  .string()
  .email("Voer een geldig e-mailadres in")
  .refine(isAllowedEmail, {
    message: `Alleen e-mailadressen met @${ALLOWED_EMAIL_DOMAIN} zijn toegestaan`,
  });

export function validateEmailOrThrow(email: string): string {
  const result = loginEmailSchema.safeParse(email);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Ongeldig e-mailadres");
  }
  return result.data.trim().toLowerCase();
}

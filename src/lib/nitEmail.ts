// Keep this list in sync with base_domains inside public.is_nit_email() in Postgres.
// Subdomains are matched automatically — new branch subdomains need no change here.
export const NIT_BASE_DOMAINS = ["nitrr.ac.in"];

export function isNitEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const parts = email.toLowerCase().trim().split("@");
  if (parts.length !== 2) return false;
  const domain = parts[1].trim();
  return NIT_BASE_DOMAINS.some(
    (b) => domain === b || domain.endsWith("." + b)
  );
}

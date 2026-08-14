/**
 * Resolves the canonical site URL for auth redirects.
 *
 * For production/preview deployments it's important to use a stable origin
 * so Supabase's recovery links redirect back to the same host that issued
 * them. Prefers NEXT_PUBLIC_SITE_URL when set, otherwise falls back to the
 * current origin (client) or a localhost default (server).
 */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://localhost:3000";
}

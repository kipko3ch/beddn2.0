// Link-safety helpers for host-provided URLs (group links, websites).
// Never allow javascript:/data: schemes; only http(s) and mailto/tel.

const SAFE_SCHEMES = ["http:", "https:", "mailto:", "tel:"];

/** Returns a safe href, or null if the URL is missing/blocked/malformed. */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Default bare domains to https so "example.com" still works.
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (!SAFE_SCHEMES.includes(url.protocol.toLowerCase())) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function isSafeExternalUrl(raw: string | null | undefined): boolean {
  return safeExternalUrl(raw) !== null;
}

/** Attributes to spread onto an external <a>. */
export const EXTERNAL_LINK_ATTRS = {
  target: "_blank" as const,
  rel: "nofollow noopener noreferrer" as const,
};

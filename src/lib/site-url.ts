// Resolve the public-facing base URL for links we put in emails or redirects.
//
// Behind a reverse proxy (Coolify/Traefik) `new URL(request.url).origin` is the
// INTERNAL address (e.g. http://localhost:3000), so links built from it break
// for real users. Prefer the configured site URL, then the forwarded host the
// proxy sends, and only fall back to the request origin for local dev.
export function publicBaseUrl(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  let origin = "";
  try {
    origin = new URL(request.url).origin;
  } catch {
    origin = "";
  }
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin)
  ).replace(/\/$/, "");
}

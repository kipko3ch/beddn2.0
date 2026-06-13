// Lightweight client-side analytics. Fire-and-forget: never blocks the UI and
// never throws. Uses sendBeacon when available so events survive navigation.
import type { ListingEventType } from "@/lib/types";

const SESSION_KEY = "beddn_session_id";

/** Stable per-browser session id (best effort; not security-sensitive). */
export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

export function track(
  eventType: ListingEventType,
  options: { listingId?: string | null; metadata?: Record<string, unknown> } = {}
): void {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({
    eventType,
    listingId: options.listingId ?? null,
    sessionId: getSessionId(),
    metadata: options.metadata ?? {},
  });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {
    // fall through to fetch
  }
  // keepalive lets the request finish even if the page is unloading.
  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

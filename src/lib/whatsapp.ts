// Builds the WhatsApp hand-off link for a saved inquiry. The message ALWAYS
// mentions Beddn so the host knows the lead came through the platform.

export interface WhatsAppMessageInput {
  listingName: string;
  guestName: string;
  category?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  hourlySlot?: string | null;
  guests?: number | null;
}

function formatDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Strip everything except digits; WhatsApp wa.me expects a bare number. */
export function normalizeWhatsApp(phone: string): string {
  return (phone || "").replace(/[^\d]/g, "");
}

export function buildWhatsAppMessage(input: WhatsAppMessageInput): string {
  const guests = input.guests && input.guests > 0 ? input.guests : 1;
  const guestLabel = `${guests} guest${guests === 1 ? "" : "s"}`;
  const name = input.guestName?.trim() || "a guest";

  // Hourly stays describe a single date + time slot; everything else a range.
  if (input.category === "hourly") {
    const date = formatDate(input.checkIn);
    const slot = input.hourlySlot ? ` for ${input.hourlySlot}` : "";
    return (
      `Hi, I found your stay on Beddn. I'm interested in ${input.listingName}` +
      `${date ? ` on ${date}` : ""}${slot} for ${guestLabel}. ` +
      `My name is ${name}. Is it available?`
    );
  }

  const from = formatDate(input.checkIn);
  const to = formatDate(input.checkOut);
  const when = from && to ? ` from ${from} to ${to}` : from ? ` on ${from}` : "";
  return (
    `Hi, I found your stay on Beddn. I'm interested in ${input.listingName}` +
    `${when} for ${guestLabel}. My name is ${name}. Is it available?`
  );
}

/** Full wa.me URL with the prefilled, Beddn-credited message. */
export function buildWhatsAppUrl(phone: string, input: WhatsAppMessageInput): string {
  const number = normalizeWhatsApp(phone);
  const text = encodeURIComponent(buildWhatsAppMessage(input));
  return `https://wa.me/${number}?text=${text}`;
}

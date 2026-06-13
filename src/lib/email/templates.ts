// Clean, brand-consistent HTML email templates. Custom web fonts don't load
// reliably in email clients, so we use a warm system stack and lean on Beddn's
// burgundy (#800020) + wordmark for identity. All templates share one shell.

const BRAND = "#800020";
const INK = "#2b000a";
const MUTED = "#6f6568";

function shell(opts: { title: string; bodyHtml: string; preheader?: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f1f2;font-family:Georgia,'Times New Roman',serif;">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preheader}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1f2;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #efe3e7;">
      <tr><td style="padding:22px 28px;border-bottom:1px solid #f2e7eb;">
        <span style="font-family:Georgia,serif;font-size:26px;font-weight:bold;color:${INK};letter-spacing:-0.5px;">Beddn</span>
      </td></tr>
      <tr><td style="padding:28px;font-family:-apple-system,'Segoe UI',Arial,sans-serif;color:${INK};">
        ${opts.bodyHtml}
      </td></tr>
      <tr><td style="padding:18px 28px;border-top:1px solid #f2e7eb;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:12px;color:${MUTED};">
        Beddn — verified stays across Africa. Payments and final arrangements are handled directly with the host.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-weight:bold;font-size:15px;padding:13px 26px;border-radius:999px;">${label}</a>`;
}

export interface InquiryEmailInput {
  guestName: string;
  listingName: string;
  reviewUrl: string;
  whatsappUrl?: string | null;
}

/** Sent right after an inquiry: confirms it and primes the review. */
export function inquiryReceivedEmail(input: InquiryEmailInput): { subject: string; html: string } {
  const first = (input.guestName || "there").split(" ")[0];
  const html = shell({
    title: "Your Beddn inquiry is ready",
    preheader: `Continue with the host on WhatsApp, and remember to review ${input.listingName} after your stay.`,
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:22px;color:${INK};">Hi ${first}, your inquiry is ready 🎉</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${MUTED};">
        You inquired about <strong style="color:${INK};">${input.listingName}</strong>. Continue the conversation with the host on WhatsApp to confirm your dates and details.
      </p>
      ${input.whatsappUrl ? `<p style="margin:0 0 20px;">${button(input.whatsappUrl, "Continue on WhatsApp")}</p>` : ""}
      <div style="background:#fbf7f8;border-radius:14px;padding:16px 18px;margin:8px 0 4px;">
        <p style="margin:0 0 6px;font-size:15px;font-weight:bold;color:${INK};">Did you book? Don't forget to review ⭐</p>
        <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:${MUTED};">
          After your stay, a quick review helps other guests and keeps Beddn trustworthy.
        </p>
        ${button(input.reviewUrl, "Leave a review")}
      </div>
    `,
  });
  return { subject: `Your Beddn inquiry for ${input.listingName}`, html };
}

export interface ReviewReminderInput {
  guestName: string;
  listingName: string;
  reviewUrl: string;
}

/** Sent later as a nudge: "did you book? remember to review". */
export function reviewReminderEmail(input: ReviewReminderInput): { subject: string; html: string } {
  const first = (input.guestName || "there").split(" ")[0];
  const html = shell({
    title: "How was your stay?",
    preheader: `Leave a quick review for ${input.listingName} on Beddn.`,
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:22px;color:${INK};">Hi ${first}, did you book ${input.listingName}?</h1>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:${MUTED};">
        If you stayed, please take a moment to leave a review. It only takes a few seconds and helps other guests find great hosts.
      </p>
      <p style="margin:0;">${button(input.reviewUrl, "Leave a review")}</p>
    `,
  });
  return { subject: `How was ${input.listingName}? Leave a review`, html };
}

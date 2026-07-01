// Clean, brand-consistent HTML email templates. Custom web fonts don't load
// reliably in email clients, so we use a warm system stack and lean on Beddn's
// burgundy (#800020) + wordmark for identity. All templates share one shell.

const BRAND = "#800020";
const INK = "#2b000a";
const MUTED = "#6f6568";

// Absolute URL for the logo — email clients can't load relative paths. Falls
// back to the production domain when NEXT_PUBLIC_SITE_URL isn't set.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://beddn.com").replace(/\/$/, "");
const LOGO_URL = `${SITE_URL}/images/logo.png`;
// Light-on-dark variant shown in dark-mode clients.
const LOGO_DARK_URL = `${SITE_URL}/images/logo-new.png`;

function shell(opts: { title: string; bodyHtml: string; preheader?: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${opts.title}</title>
<style>
  /* Swap to the light-on-dark logo in dark mode. Supported by Apple Mail,
     iOS Mail and Outlook mobile; Gmail strips this and keeps the light logo
     (it preserves our background colors, so that stays readable). */
  @media (prefers-color-scheme: dark) {
    .logo-light { display: none !important; }
    .logo-dark { display: inline-block !important; }
  }
  /* Outlook.com / Outlook app prefix overridden styles with [data-ogsc]. */
  [data-ogsc] .logo-light { display: none !important; }
  [data-ogsc] .logo-dark { display: inline-block !important; }
</style>
</head>
<body style="margin:0;padding:0;background:#f5f1f2;font-family:Georgia,'Times New Roman',serif;">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preheader}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1f2;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;overflow:hidden;border:1px solid #efe3e7;">
      <tr><td style="padding:20px 28px;border-bottom:1px solid #f2e7eb;">
        <img class="logo-light" src="${LOGO_URL}" alt="Beddn" height="30" style="display:block;height:30px;width:auto;border:0;outline:none;text-decoration:none;">
        <!--[if !mso]><!-->
        <img class="logo-dark" src="${LOGO_DARK_URL}" alt="Beddn" height="30" style="display:none;height:30px;width:auto;border:0;outline:none;text-decoration:none;">
        <!--<![endif]-->
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
      <div style="background:#fbf7f8;border-left:3px solid ${BRAND};padding:16px 18px;margin:8px 0 4px;">
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

export interface MagicLinkInput {
  url: string;
}

/** Passwordless sign-in link, delivered via Beddn's own (ZeptoMail) pipeline
 * instead of Supabase's built-in email so it actually reaches the inbox. */
export function magicLinkEmail(input: MagicLinkInput): { subject: string; html: string } {
  const html = shell({
    title: "Your Beddn sign-in link",
    preheader: "Tap to sign in to Beddn — this link expires shortly.",
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:22px;color:${INK};">Sign in to Beddn</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${MUTED};">
        Tap the button below to finish signing in. Open it on the same device you started from. For your security, this link expires shortly and can only be used once.
      </p>
      <p style="margin:0 0 20px;">${button(input.url, "Sign in to Beddn")}</p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED};">
        If you didn't request this, you can safely ignore this email.
      </p>
    `,
  });
  return { subject: "Your Beddn sign-in link", html };
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

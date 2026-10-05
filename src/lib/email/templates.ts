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
  code?: string;
}

/** Passwordless sign-in link, delivered via Beddn's own (ZeptoMail) pipeline
 * instead of Supabase's built-in email so it actually reaches the inbox. */
export function magicLinkEmail(input: MagicLinkInput): { subject: string; html: string } {
  const html = shell({
    title: "Your Beddn sign-in code",
    preheader: input.code
      ? `Your Beddn verification code is ${input.code}. Valid for 10 minutes.`
      : "Tap to sign in to Beddn — this link expires in 10 minutes.",
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:22px;color:${INK};">Sign in to Beddn</h1>
      <div style="display:inline-block;background:#fef2f2;border:1px solid #fee2e2;border-radius:8px;padding:6px 12px;margin:0 0 16px;font-size:13px;color:#991b1b;font-weight:700;">
        ⏱️ Code &amp; link expire in 10 minutes
      </div>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${MUTED};">
        Tap the button below to finish signing in automatically on this device:
      </p>
      <p style="margin:0 0 24px;">${button(input.url, "Sign in to Beddn")}</p>
      ${
        input.code
          ? `
      <div style="background:#fdf2f4;border:1px solid #f9c8d4;border-radius:16px;padding:20px;text-align:center;margin:20px 0 24px;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#a3193d;">
          Or enter this 6-digit code on your device
        </p>
        <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#800020;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;margin:8px 0;">
          ${input.code}
        </div>
        <p style="margin:0;font-size:13px;line-height:1.5;color:${MUTED};">
          Valid for <strong>10 minutes</strong>. If you requested this on your computer or another device, enter this code there to complete sign-in.
        </p>
      </div>`
          : ""
      }
      <p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED};">
        For your security, this sign-in link and verification code expire in 10 minutes. If you didn't request this, you can safely ignore this email.
      </p>
    `,
  });
  return { subject: "Your Beddn sign-in code (valid for 10 mins)", html };
}

export interface HostApprovedInput {
  hostName: string;
  dashboardUrl: string;
}

/** Sent when the admin team approves a host application. */
export function hostApprovedEmail(input: HostApprovedInput): { subject: string; html: string } {
  const first = (input.hostName || "there").split(" ")[0];
  const html = shell({
    title: "You're approved to host on Beddn",
    preheader: "Your host account is approved — you can publish listings now.",
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:22px;color:${INK};">You're approved, ${first} 🎉</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${MUTED};">
        Your Beddn host account has been reviewed and approved. You can now publish listings and start receiving booking requests.
      </p>
      <p style="margin:0;">${button(input.dashboardUrl, "Go to your dashboard")}</p>
    `,
  });
  return { subject: "You're approved to host on Beddn", html };
}

export interface HostRejectedInput {
  hostName: string;
  reason?: string | null;
}

/** Sent when the admin team rejects a host application. */
export function hostRejectedEmail(input: HostRejectedInput): { subject: string; html: string } {
  const first = (input.hostName || "there").split(" ")[0];
  const html = shell({
    title: "Update on your Beddn host application",
    preheader: "Your host application wasn't approved this time.",
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:22px;color:${INK};">Hi ${first}, an update on your application</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${MUTED};">
        Your Beddn host application wasn't approved this time.
      </p>
      ${input.reason ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${INK};"><strong>Reason:</strong> ${input.reason}</p>` : ""}
      <p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED};">
        If you think this was a mistake or want to reapply with more details, reply to this email and our team will help.
      </p>
    `,
  });
  return { subject: "Update on your Beddn host application", html };
}

export interface BookingStatusInput {
  guestName: string;
  listingName: string;
  bookingCode: string;
  bookingUrl?: string;
}

/** Sent when a host (or auto-accept) confirms a booking request. */
export function bookingConfirmedEmail(input: BookingStatusInput): { subject: string; html: string } {
  const first = (input.guestName || "there").split(" ")[0];
  const html = shell({
    title: "Your Beddn booking is confirmed",
    preheader: `${input.listingName} is confirmed — ref ${input.bookingCode}.`,
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:22px;color:${INK};">Hi ${first}, you're confirmed 🎉</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${MUTED};">
        Your booking for <strong style="color:${INK};">${input.listingName}</strong> is confirmed. Ref: <strong style="color:${INK};">${input.bookingCode}</strong>.
      </p>
      ${input.bookingUrl ? `<p style="margin:0 0 20px;">${button(input.bookingUrl, "View your booking")}</p>` : ""}
      <p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED};">
        Address and host contact are now visible on your booking page.
      </p>
    `,
  });
  return { subject: `Confirmed: ${input.listingName} (${input.bookingCode})`, html };
}

/** Sent when a host rejects a booking request. */
export function bookingRejectedEmail(input: BookingStatusInput): { subject: string; html: string } {
  const first = (input.guestName || "there").split(" ")[0];
  const html = shell({
    title: "Update on your Beddn booking",
    preheader: `${input.listingName} was declined by the host — ref ${input.bookingCode}.`,
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:22px;color:${INK};">Hi ${first}, an update on your booking</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${MUTED};">
        Your booking request for <strong style="color:${INK};">${input.listingName}</strong> (ref <strong style="color:${INK};">${input.bookingCode}</strong>) was declined by the host.
      </p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED};">
        Beddn's team will follow up about resolution or a refund. You can also browse other verified places in the meantime.
      </p>
    `,
  });
  return { subject: `Declined: ${input.listingName} (${input.bookingCode})`, html };
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

export interface BookingRequestedGuestInput {
  guestName: string;
  listingName: string;
  bookingCode: string;
  dates: string;
  guestsCount: number;
  totalAmount?: number;
  currency?: string;
  bookingUrl?: string;
  hostName?: string | null;
  hostPhone?: string | null;
  callUrl?: string | null;
  whatsappUrl?: string | null;
}

/** Sent to guest when they submit a booking request. */
export function bookingRequestedGuestEmail(input: BookingRequestedGuestInput): { subject: string; html: string } {
  const first = (input.guestName || "there").split(" ")[0];
  const hostLabel = input.hostName ? input.hostName : "your host";

  const html = shell({
    title: "Booking Request Sent — Beddn",
    preheader: `Your booking request for ${input.listingName} has been submitted (Ref: ${input.bookingCode}). Call or WhatsApp the host directly.`,
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:22px;color:${INK};">Request sent to host, ${first} ✨</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${MUTED};">
        Your booking request for <strong style="color:${INK};">${input.listingName}</strong> has been submitted. The host has been notified to confirm availability.
      </p>
      <div style="background:#fdf2f4;border:1px solid #f9c8d4;border-radius:14px;padding:18px 20px;margin:16px 0 20px;">
        <table role="presentation" width="100%" cellpadding="4" cellspacing="0" style="font-size:14px;color:${INK};">
          <tr><td><strong>Reference:</strong></td><td><code style="background:#fff;padding:2px 6px;border-radius:4px;border:1px solid #f9c8d4;color:${BRAND};font-weight:bold;">${input.bookingCode}</code></td></tr>
          <tr><td><strong>Dates / Time:</strong></td><td>${input.dates}</td></tr>
          <tr><td><strong>Guests:</strong></td><td>${input.guestsCount}</td></tr>
          ${input.totalAmount ? `<tr><td><strong>Estimated total:</strong></td><td><strong>${input.currency || "KES"} ${input.totalAmount.toLocaleString()}</strong> (Pay upon arrival)</td></tr>` : ""}
        </table>
      </div>

      <!-- Call & WhatsApp Action Buttons replacing status button -->
      <div style="margin:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:15px;font-weight:bold;color:${INK};">
          Contact ${hostLabel} directly:
        </p>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
          <tr>
            ${
              input.whatsappUrl
                ? `<td style="padding-right:12px;padding-bottom:10px;">
                    <a href="${input.whatsappUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#25D366;color:#ffffff;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:14px;font-weight:700;line-height:44px;text-align:center;text-decoration:none;padding:0 22px;border-radius:10px;box-shadow:0 2px 4px rgba(37,211,102,0.25);">
                      💬 WhatsApp Host
                    </a>
                  </td>`
                : ""
            }
            ${
              input.callUrl
                ? `<td style="padding-bottom:10px;">
                    <a href="${input.callUrl}" style="display:inline-block;background:${BRAND};color:#ffffff;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:14px;font-weight:700;line-height:44px;text-align:center;text-decoration:none;padding:0 22px;border-radius:10px;">
                      📞 Call Host
                    </a>
                  </td>`
                : ""
            }
          </tr>
        </table>
        ${
          input.hostPhone
            ? `<p style="margin:4px 0 0;font-size:13px;color:${MUTED};">Direct phone: <strong style="color:${INK};">${input.hostPhone}</strong></p>`
            : ""
        }
      </div>

      ${
        input.bookingUrl
          ? `<p style="margin:16px 0 16px;font-size:13px;color:${MUTED};">
              <a href="${input.bookingUrl}" style="color:${BRAND};text-decoration:underline;">View booking details online →</a>
            </p>`
          : ""
      }

      <p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED};">
        Payment is made upon arrival once the host confirms your check-in.
      </p>
    `,
  });
  return { subject: `Booking Request Sent: ${input.listingName} (${input.bookingCode})`, html };
}

export interface BookingRequestedHostInput {
  hostName: string;
  guestName: string;
  listingName: string;
  bookingCode: string;
  dates: string;
  guestsCount: number;
  note?: string | null;
  dashboardUrl: string;
}

/** Sent to host when a guest makes a booking request. */
export function bookingRequestedHostEmail(input: BookingRequestedHostInput): { subject: string; html: string } {
  const first = (input.hostName || "there").split(" ")[0];
  const html = shell({
    title: "New Booking Request on Beddn",
    preheader: `New request from ${input.guestName} for ${input.listingName} (Ref: ${input.bookingCode}).`,
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:22px;color:${INK};">New booking request, ${first} 🛎️</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${MUTED};">
        <strong style="color:${INK};">${input.guestName}</strong> submitted a booking request for your property <strong style="color:${INK};">${input.listingName}</strong>.
      </p>
      <div style="background:#fbf7f8;border-left:3px solid ${BRAND};padding:16px 18px;margin:16px 0 20px;">
        <p style="margin:0 0 6px;font-size:14px;color:${INK};"><strong>Booking Ref:</strong> ${input.bookingCode}</p>
        <p style="margin:0 0 6px;font-size:14px;color:${INK};"><strong>Dates / Time:</strong> ${input.dates}</p>
        <p style="margin:0 0 6px;font-size:14px;color:${INK};"><strong>Guests:</strong> ${input.guestsCount}</p>
        ${input.note ? `<p style="margin:0;font-size:14px;color:${INK};"><strong>Guest Note:</strong> "${input.note}"</p>` : ""}
      </div>
      <p style="margin:0 0 16px;">${button(input.dashboardUrl, "Review request in dashboard")}</p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED};">
        Responding promptly helps maintain your search visibility and guest rating.
      </p>
    `,
  });
  return { subject: `🛎️ New Booking Request: ${input.listingName} (${input.guestName})`, html };
}

export interface ListingVerifiedInput {
  hostName: string;
  listingName: string;
  listingUrl: string;
}

/** Sent when a listing is verified by admin. */
export function listingVerifiedEmail(input: ListingVerifiedInput): { subject: string; html: string } {
  const first = (input.hostName || "there").split(" ")[0];
  const html = shell({
    title: "Your Listing is Verified on Beddn",
    preheader: `${input.listingName} now has the official Beddn verified trust badge.`,
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:22px;color:${INK};">Your property is verified, ${first}! 🛡️</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${MUTED};">
        Congratulations! <strong style="color:${INK};">${input.listingName}</strong> has been verified by the Beddn team and now proudly displays the official <strong>Verified Badge</strong>.
      </p>
      <div style="background:#fdf2f4;border:1px solid #f9c8d4;border-radius:12px;padding:16px 20px;margin:16px 0 20px;">
        <p style="margin:0;font-size:14px;color:${BRAND};font-weight:bold;">
          ✓ Verified badge active · Priority in search results · Higher guest booking conversion
        </p>
      </div>
      <p style="margin:0 0 16px;">${button(input.listingUrl, "View your verified listing")}</p>
    `,
  });
  return { subject: `🛡️ Verified Badge Approved: ${input.listingName}`, html };
}

export interface ProTierActivatedInput {
  hostName: string;
  listingName: string;
  tierName: string;
  expiresAt: string;
  dashboardUrl: string;
}

/** Sent when admin activates a Pro / Featured tier for a listing. */
export function proTierActivatedEmail(input: ProTierActivatedInput): { subject: string; html: string } {
  const first = (input.hostName || "there").split(" ")[0];
  const html = shell({
    title: `${input.tierName} Tier Activated — Beddn`,
    preheader: `${input.listingName} is now promoted as ${input.tierName}. Active until ${input.expiresAt}.`,
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:22px;color:${INK};">${input.tierName} is active, ${first}! ⭐</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${MUTED};">
        Your promotion tier <strong>${input.tierName}</strong> for <strong style="color:${INK};">${input.listingName}</strong> has been activated.
      </p>
      <div style="background:#fdf2f4;border:1px solid #f9c8d4;border-radius:12px;padding:16px 20px;margin:16px 0 20px;">
        <p style="margin:0 0 4px;font-size:13px;color:${MUTED};text-transform:uppercase;letter-spacing:1px;font-weight:bold;">Promotion Details</p>
        <p style="margin:0 0 4px;font-size:16px;font-weight:bold;color:${BRAND};">${input.tierName} Placement</p>
        <p style="margin:0;font-size:13px;color:${INK};"><strong>Valid until:</strong> ${input.expiresAt}</p>
      </div>
      <p style="margin:0 0 16px;">${button(input.dashboardUrl, "Open Host Dashboard")}</p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED};">
        You can track your views, clicks, and inquiries in real time on your dashboard analytics.
      </p>
    `,
  });
  return { subject: `⭐ ${input.tierName} Promotion Activated: ${input.listingName}`, html };
}

export interface HostAnnouncementEmailInput {
  hostName: string;
  title: string;
  message: string;
  dashboardUrl: string;
}

/** Sent when admin broadcasts an announcement to registered hosts. */
export function hostAnnouncementEmail(input: HostAnnouncementEmailInput): { subject: string; html: string } {
  const first = (input.hostName || "there").split(" ")[0];
  const html = shell({
    title: input.title,
    preheader: input.title,
    bodyHtml: `
      <h1 style="margin:0 0 14px;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:22px;color:${INK};">${input.title}</h1>
      <p style="margin:0 0 16px;font-size:14px;color:${MUTED};">Hello ${first},</p>
      <div style="font-size:15px;line-height:1.7;color:${INK};margin:0 0 24px;white-space:pre-line;">
        ${input.message}
      </div>
      <p style="margin:0 0 16px;">${button(input.dashboardUrl, "Visit Host Dashboard")}</p>
      <p style="margin:0;font-size:12px;color:${MUTED};">
        You received this notification because you are a registered host on Beddn.
      </p>
    `,
  });
  return { subject: `📢 Beddn Host Update: ${input.title}`, html };
}

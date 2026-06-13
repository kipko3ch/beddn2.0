"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle, ShieldCheck, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { track } from "@/lib/track";
import type { AvailabilityStatus } from "@/lib/types";

export interface InquiryDraft {
  category: string;
  checkIn: string;
  checkOut: string;
  hourlySlot: string;
  guests: number;
  availabilityStatus: AvailabilityStatus;
}

interface InquiryFlowProps {
  listing: { id: string; name: string; title?: string | null; slug: string };
  user: User | null;
  draft: InquiryDraft;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATE_PREFIX = "beddn_inquiry_";

type FormDraft = { guestName: string; guestWhatsapp: string; message: string };

/**
 * Login-gated inquiry flow. Because AuthDialog redirects for OAuth/OTP, the
 * guest's typed details are saved to sessionStorage and the inquiry sheet is
 * re-opened on return (the property page reads ?inquiry=1).
 */
export function InquiryFlow({ listing, user, draft, open, onOpenChange }: InquiryFlowProps) {
  const storageKey = `${STATE_PREFIX}${listing.id}`;
  const [guestName, setGuestName] = useState("");
  const [guestWhatsapp, setGuestWhatsapp] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);

  const listingName = listing.title || listing.name;

  // Rehydrate any saved draft (e.g. after a login redirect) once on mount.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as FormDraft;
        setGuestName((v) => v || saved.guestName || "");
        setGuestWhatsapp((v) => v || saved.guestWhatsapp || "");
        setMessage((v) => v || saved.message || "");
      }
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  // Prefill name from the signed-in profile if still empty.
  useEffect(() => {
    if (user) {
      const fullName = (user.user_metadata?.full_name as string | undefined) ?? "";
      if (fullName) setGuestName((v) => v || fullName);
    }
  }, [user]);

  // Analytics: distinguish "had to log in" from "started filling the form".
  useEffect(() => {
    if (!open) return;
    if (user) track("INQUIRY_STARTED", { listingId: listing.id });
    else track("LOGIN_REQUIRED_FOR_CONTACT", { listingId: listing.id });
  }, [open, user, listing.id]);

  const draftSummary = useMemo(() => {
    const parts: string[] = [];
    if (draft.checkIn) {
      parts.push(
        draft.category === "overnight" && draft.checkOut
          ? `${draft.checkIn} → ${draft.checkOut}`
          : draft.checkIn
      );
    }
    if (draft.category === "hourly" && draft.hourlySlot) parts.push(draft.hourlySlot);
    parts.push(`${draft.guests} guest${draft.guests === 1 ? "" : "s"}`);
    return parts.join(" · ");
  }, [draft]);

  function persistDraft() {
    try {
      const payload: FormDraft = { guestName, guestWhatsapp, message };
      sessionStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }

  // Save the typed details and flag the URL so we can re-open after the
  // login redirect returns to this same listing.
  function beforeLoginRedirect() {
    persistDraft();
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("inquiry", "1");
      window.history.replaceState({}, "", url);
    } catch {
      /* ignore */
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError("");

    if (guestName.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (guestWhatsapp.replace(/[^\d]/g, "").length < 7) {
      setError("Please enter a valid WhatsApp number.");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId: listing.id,
        guestName: guestName.trim(),
        guestWhatsapp: guestWhatsapp.trim(),
        category: draft.category,
        checkIn: draft.checkIn || null,
        checkOut: draft.category === "overnight" ? draft.checkOut || null : null,
        hourlySlot: draft.category === "hourly" ? draft.hourlySlot || null : null,
        guestsCount: draft.guests,
        message: message.trim() || null,
        availabilityStatus: draft.availabilityStatus,
        sessionId: (() => {
          try {
            return localStorage.getItem("beddn_session_id");
          } catch {
            return null;
          }
        })(),
        company, // honeypot
      }),
    });
    setSubmitting(false);

    const json = (await res.json().catch(() => ({}))) as {
      whatsappUrl?: string | null;
      error?: string;
    };
    if (!res.ok) {
      if (res.status === 401) {
        setError("Please log in to contact this host.");
      } else {
        setError(json.error || "Could not send your inquiry. Please try again.");
      }
      return;
    }

    track("INQUIRY_SUBMITTED", { listingId: listing.id });
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    setWhatsappUrl(json.whatsappUrl ?? null);
  }

  function continueOnWhatsApp() {
    track("WHATSAPP_CLICK", { listingId: listing.id });
    if (whatsappUrl) window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl sm:p-6">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
          className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Success: inquiry saved, hand off to WhatsApp. */}
        {whatsappUrl !== null ? (
          <div className="pt-6 text-center">
            <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-[#f0faf4] text-[#1a7f46]">
              <ShieldCheck className="h-7 w-7" />
            </span>
            <h2 className="text-xl font-bold text-[#2b000a]">Your inquiry has been prepared</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Continue to WhatsApp to confirm directly with the host. Your dates and details are
              already in the message.
            </p>
            <Button
              onClick={continueOnWhatsApp}
              className="mt-6 h-12 w-full rounded-full bg-[#25D366] text-base font-bold text-white hover:bg-[#1fb959]"
            >
              <MessageCircle className="mr-2 h-5 w-5" /> Continue on WhatsApp
            </Button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="mt-3 text-sm font-semibold text-muted-foreground underline"
            >
              Done
            </button>
          </div>
        ) : !user ? (
          /* Login gate. */
          <div className="pt-6">
            <h2 className="text-xl font-bold text-[#2b000a]">Log in to Contact Host</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Log in to contact this host. This helps Beddn reduce spam and send cleaner inquiries
              with your dates and guest details.
            </p>
            {draftSummary && (
              <p className="mt-3 rounded-xl bg-[#fbf7f8] px-4 py-3 text-sm font-semibold text-[#2b000a]">
                {listingName} · {draftSummary}
              </p>
            )}
            <AuthDialog>
              <button
                type="button"
                onClick={beforeLoginRedirect}
                className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-[#800020] text-base font-bold text-white hover:bg-[#600018]"
              >
                Log in to Contact Host
              </button>
            </AuthDialog>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Beddn helps you find verified stays and send structured inquiries. Payments, price
              negotiation, and final arrangements are handled directly with the host for now.
            </p>
          </div>
        ) : (
          /* Inquiry form. */
          <form onSubmit={submit} className="pt-6">
            <h2 className="text-xl font-bold text-[#2b000a]">Send Inquiry</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Beddn sends the host a clean inquiry with your dates, guest count, and contact details
              before you continue to WhatsApp.
            </p>
            {draftSummary && (
              <p className="mt-3 rounded-xl bg-[#fbf7f8] px-4 py-3 text-sm font-semibold text-[#2b000a]">
                {listingName} · {draftSummary}
              </p>
            )}

            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="inq-name">Full name</Label>
                <Input
                  id="inq-name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Your name"
                  className="mt-1 h-11"
                  required
                />
              </div>
              <div>
                <Label htmlFor="inq-whatsapp">WhatsApp number</Label>
                <Input
                  id="inq-whatsapp"
                  type="tel"
                  value={guestWhatsapp}
                  onChange={(e) => setGuestWhatsapp(e.target.value)}
                  placeholder="+254..."
                  className="mt-1 h-11"
                  required
                />
              </div>
              <div>
                <Label htmlFor="inq-message">Message to host (optional)</Label>
                <Textarea
                  id="inq-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Anything the host should know."
                  className="mt-1"
                />
              </div>
              {/* Honeypot — hidden from humans, catches bots. */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="hidden"
                aria-hidden
              />
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <Button
              type="submit"
              disabled={submitting}
              className="mt-5 h-12 w-full rounded-full bg-[#800020] text-base font-bold hover:bg-[#600018]"
            >
              {submitting ? "Sending…" : "Send Inquiry"}
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Payments and final arrangements are handled directly with the host on WhatsApp.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

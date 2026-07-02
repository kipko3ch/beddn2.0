"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, Lock, ShieldCheck, Sparkles, Star, Users, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { AuthDialog } from "@/components/auth-dialog";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
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
  listing: { id: string; name: string; title?: string | null; slug: string; image?: string | null };
  user: User | null;
  draft: InquiryDraft;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATE_PREFIX = "beddn_inquiry_";

type FormDraft = { guestName: string; guestWhatsapp: string; message: string };

/**
 * Full-screen, Beddn-styled inquiry flow. AuthDialog redirects for Google or email magic links,
 * so the typed draft is saved to sessionStorage and the sheet re-opens on
 * return (the property page reads ?inquiry=1). The WhatsApp hand-off is part of
 * the same flow and is tied to the created inquiry id.
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
  const [inquiryId, setInquiryId] = useState<string | null>(null);

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

  useEffect(() => {
    if (user) {
      const fullName = (user.user_metadata?.full_name as string | undefined) ?? "";
      if (fullName) setGuestName((v) => v || fullName);
    }
  }, [user]);

  // Lock body scroll while the full-screen overlay is open.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Analytics: distinguish "had to log in" from "started filling the form".
  useEffect(() => {
    if (!open) return;
    if (user) track("INQUIRY_STARTED", { listingId: listing.id });
    else track("LOGIN_REQUIRED_FOR_CONTACT", { listingId: listing.id });
  }, [open, user, listing.id]);

  const summary = useMemo(() => {
    const out: { icon: React.ElementType; label: string }[] = [];
    if (draft.checkIn) {
      out.push({
        icon: CalendarDays,
        label:
          draft.category === "overnight" && draft.checkOut
            ? `${draft.checkIn} → ${draft.checkOut}`
            : draft.checkIn,
      });
    }
    if (draft.category === "hourly" && draft.hourlySlot) {
      out.push({ icon: Clock, label: draft.hourlySlot });
    }
    out.push({
      icon: Users,
      label: `${draft.guests} guest${draft.guests === 1 ? "" : "s"}`,
    });
    return out;
  }, [draft]);

  function persistDraft() {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ guestName, guestWhatsapp, message }));
    } catch {
      /* ignore */
    }
  }

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
        company,
      }),
    });
    setSubmitting(false);

    const json = (await res.json().catch(() => ({}))) as {
      whatsappUrl?: string | null;
      inquiryId?: string;
      error?: string;
    };
    if (!res.ok) {
      setError(
        res.status === 401
          ? "Please log in to contact this host."
          : json.error || "Could not send your inquiry. Please try again."
      );
      return;
    }

    track("INQUIRY_SUBMITTED", { listingId: listing.id, metadata: { inquiry_id: json.inquiryId } });
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    setInquiryId(json.inquiryId ?? null);
    setWhatsappUrl(json.whatsappUrl ?? null);
  }

  function continueOnWhatsApp() {
    // Tie the WhatsApp click to the created lead so the hand-off is measurable.
    track("WHATSAPP_CLICK", { listingId: listing.id, metadata: { inquiry_id: inquiryId } });
    if (whatsappUrl) window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  if (!open) return null;

  const submitted = whatsappUrl !== null || inquiryId !== null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-white">
      {/* Branded header */}
      <header className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
        <span className="font-brand text-2xl leading-none text-[#2b000a]">Beddn</span>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
          className="flex size-9 items-center justify-center rounded-full hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:py-10">
          {/* Left: context / value props */}
          <aside className="order-2 lg:order-1">
            <div className="overflow-hidden rounded-3xl border bg-[#fbf7f8]">
              {listing.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={listing.image} alt="" className="h-40 w-full object-cover sm:h-48" />
              )}
              <div className="p-5">
                <h2 className="font-brand text-2xl text-[#2b000a]">{listingName}</h2>
                <ul className="mt-3 space-y-2">
                  {summary.map(({ icon: Icon, label }) => (
                    <li key={label} className="flex items-center gap-2 text-sm text-[#2b000a]">
                      <Icon className="h-4 w-4 text-crimson" />
                      <span className="font-medium">{label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 space-y-3 rounded-3xl border p-5 text-sm">
              {[
                { icon: ShieldCheck, title: "Cleaner, spam-free inquiries", body: "Beddn shares your dates and guest details so the host can reply faster." },
                { icon: Sparkles, title: "Stay instructions when you need them", body: "After you inquire, the host's group links and arrival notes unlock on the listing." },
                { icon: Star, title: "Remember to review later", body: "After your stay, leave a quick review to help other guests and keep Beddn trusted." },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#f8eef2] text-crimson">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-[#2b000a]">{title}</p>
                    <p className="text-muted-foreground">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Right: the actionable step */}
          <div className="order-1 lg:order-2">
            {submitted ? (
              <div className="rounded-3xl border p-6 text-center sm:p-8">
                <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-[#e9f9f0] text-[#128c4b]">
                  <ShieldCheck className="h-7 w-7" />
                </span>
                <h1 className="font-brand text-3xl text-[#2b000a]">Inquiry prepared</h1>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  Continue to WhatsApp to confirm directly with the host — your dates and details are
                  already in the message. Payments and final arrangements happen with the host.
                </p>
                <Button
                  onClick={continueOnWhatsApp}
                  disabled={!whatsappUrl}
                  className="mt-6 h-12 w-full rounded-full bg-[#25D366] text-base font-bold text-white hover:bg-[#1fb959]"
                >
                  <WhatsAppIcon className="mr-2 h-5 w-5" /> Continue on WhatsApp
                </Button>
                <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-[#fbf7f8] px-4 py-3 text-xs text-crimson">
                  <Star className="h-4 w-4" />
                  After your stay, come back to leave a review.
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="mt-3 text-sm font-semibold text-muted-foreground underline"
                >
                  Done
                </button>
              </div>
            ) : !user ? (
              <div className="rounded-3xl border p-6 sm:p-8">
                <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-[#f8eef2] text-crimson">
                  <Lock className="h-5 w-5" />
                </span>
                <h1 className="font-brand text-3xl text-[#2b000a]">Log in to Contact Host</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Log in to contact this host. This helps Beddn reduce spam and send cleaner inquiries
                  with your dates and guest details.
                </p>
                <AuthDialog>
                  <button
                    type="button"
                    onClick={beforeLoginRedirect}
                    className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-[#800020] text-base font-bold text-white hover:bg-merlot"
                  >
                    Log in to Contact Host
                  </button>
                </AuthDialog>
                <p className="mt-4 text-xs text-muted-foreground">
                  Beddn helps you find verified stays and send structured inquiries. Payments, price
                  negotiation, and final arrangements are handled directly with the host for now.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="rounded-3xl border p-6 sm:p-8">
                <h1 className="font-brand text-3xl text-[#2b000a]">Send Inquiry</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Beddn sends the host a clean inquiry with your dates, guest count, and contact
                  details before you continue to WhatsApp.
                </p>

                <div className="mt-5 space-y-4">
                  <div>
                    <Label htmlFor="inq-name">Full name</Label>
                    <Input
                      id="inq-name"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Your name"
                      className="mt-1 h-12 rounded-xl"
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
                      className="mt-1 h-12 rounded-xl"
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
                      className="mt-1 rounded-xl"
                    />
                  </div>
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
                  className="mt-5 h-12 w-full rounded-full bg-[#800020] text-base font-bold hover:bg-merlot"
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
      </div>
    </div>
  );
}

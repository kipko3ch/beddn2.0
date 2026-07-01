"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DashboardListSkeleton } from "@/components/dashboard-skeletons";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { AlertTriangle, CalendarCheck } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import type { Booking, Inquiry } from "@/lib/types";

type BookingRow = Booking & {
  request_note?: string | null;
  listing?: { name?: string; title?: string; city?: string } | null;
};
type InquiryRow = Inquiry & { listing?: { name?: string; title?: string; city?: string } | null };

function listingName(row: { listing?: { name?: string; title?: string } | null }) {
  return row.listing?.title || row.listing?.name || "Listing";
}

function datesLabel(b: BookingRow) {
  if (b.category === "overnight" && b.check_in && b.check_out) return `${b.check_in} → ${b.check_out}`;
  if (b.start_datetime) return b.start_datetime.replace("T", " ").slice(0, 16);
  return b.check_in || "Flexible";
}

// Two overnight ranges overlap if each starts before the other ends.
function overlaps(aIn?: string | null, aOut?: string | null, bIn?: string | null, bOut?: string | null) {
  if (!aIn || !aOut || !bIn || !bOut) return false;
  return aIn < bOut && bIn < aOut;
}

export default function HostRequestsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [pending, setPending] = useState<BookingRow[]>([]);
  const [confirmed, setConfirmed] = useState<BookingRow[]>([]);
  const [leads, setLeads] = useState<InquiryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: bookings } = await supabase
      .from("bookings")
      .select("*, listing:listings(name, title, city)")
      .in("status", ["requested", "paid_pending_host", "confirmed"])
      .order("created_at", { ascending: false });

    const rows = (bookings as BookingRow[]) ?? [];
    setPending(rows.filter((b) => b.status === "requested" || b.status === "paid_pending_host"));
    setConfirmed(rows.filter((b) => b.status === "confirmed"));

    try {
      const res = await fetch("/api/inquiries");
      const json: { inquiries?: InquiryRow[] } = res.ok ? await res.json() : {};
      setLeads(json.inquiries ?? []);
    } catch {
      setLeads([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(id: string, action: "accept" | "reject") {
    setWorkingId(id);
    const res = await fetch(`/api/bookings/${id}/${action}`, { method: "POST" });
    setWorkingId(null);
    if (!res.ok) {
      alert("Could not update this request. Please try again.");
      return;
    }
    await load();
  }

  function conflictFor(req: BookingRow): boolean {
    if (req.category !== "overnight") return false;
    return confirmed.some(
      (c) =>
        c.listing_id === req.listing_id &&
        overlaps(req.check_in, req.check_out, c.check_in, c.check_out)
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-brand text-3xl text-[#2b000a] sm:text-4xl">Requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirm or decline booking requests. Confirming locks the dates on your{" "}
          <Link href={ROUTES.dashboardCalendar} className="font-semibold text-[#800020] underline-offset-2 hover:underline">
            calendar
          </Link>{" "}
          and shares your contact with the guest.
        </p>
      </div>

      {loading ? (
        <DashboardListSkeleton rows={4} />
      ) : (
        <div className="space-y-8">
          {/* Action needed */}
          <section>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[#a08b92]">
              Needs your response
              {pending.length > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                  {pending.length}
                </span>
              )}
            </h2>
            {pending.length === 0 ? (
              <EmptyState
                image="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029363/empty-bookings_e7n8sb.png"
                title="No requests waiting"
                subtitle="New booking requests from guests will appear here for you to confirm."
                size="sm"
              />
            ) : (
              <div className="space-y-3">
                {pending.map((req) => {
                  const conflict = conflictFor(req);
                  return (
                    <div key={req.id} className="rounded-2xl border bg-white p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-[#2b000a]">{req.guest_name}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {listingName(req)}
                            {req.listing?.city ? ` · ${req.listing.city}` : ""}
                          </p>
                        </div>
                        <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
                          {req.status === "requested" ? "New request" : "Awaiting you"}
                        </Badge>
                      </div>

                      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Dates</p>
                          <p className="font-medium">{datesLabel(req)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Guests</p>
                          <p className="font-medium">{req.guests_count ?? req.guests ?? 1}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Type</p>
                          <p className="font-medium capitalize">{req.category}</p>
                        </div>
                      </div>

                      {(req.note || req.request_note) && (
                        <p className="mt-3 rounded-xl bg-[#fbf7f8] px-3 py-2 text-sm text-muted-foreground">
                          “{req.note || req.request_note}”
                        </p>
                      )}

                      {conflict && (
                        <p className="mt-3 flex items-center gap-2 rounded-xl border-l-[3px] border-amber-500 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          Heads up: these dates overlap another confirmed booking. Check your calendar
                          before confirming.
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          disabled={workingId === req.id}
                          onClick={() => act(req.id, "accept")}
                          className="gap-1 rounded-full bg-[#128c4b] hover:bg-[#0f7a41]"
                        >
                          <CalendarCheck className="h-4 w-4" /> Confirm &amp; lock dates
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={workingId === req.id}
                          onClick={() => act(req.id, "reject")}
                          className="rounded-full"
                        >
                          Decline
                        </Button>
                        {req.guest_phone && (
                          <a
                            href={`https://wa.me/${req.guest_phone.replace(/[^\d]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#1fb959]"
                          >
                            <WhatsAppIcon className="h-4 w-4" /> Message
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* WhatsApp leads (kept — lighter-weight inquiries) */}
          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[#a08b92]">
              WhatsApp leads
            </h2>
            {leads.length === 0 ? (
              <p className="rounded-2xl border bg-white p-4 text-sm text-muted-foreground">
                Guests who message you on WhatsApp (without a formal request) show up here.
              </p>
            ) : (
              <div className="divide-y rounded-2xl border bg-white">
                {leads.map((lead) => (
                  <div key={lead.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#2b000a]">{lead.guest_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {listingName(lead)} · {lead.check_in || "flexible"} · {lead.guests_count} guest
                        {lead.guests_count === 1 ? "" : "s"}
                      </p>
                    </div>
                    <a
                      href={`https://wa.me/${lead.guest_whatsapp.replace(/[^\d]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#1fb959]"
                    >
                      <WhatsAppIcon className="h-4 w-4" /> WhatsApp
                    </a>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

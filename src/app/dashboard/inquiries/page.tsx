"use client";

import { useEffect, useState } from "react";
import { BeddnLoader } from "@/components/beddn-loader";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";
import type { Inquiry, InquiryStatus } from "@/lib/types";

type InquiryRow = Inquiry & { listing?: { name?: string; title?: string; city?: string } | null };

const STATUS_OPTIONS: InquiryStatus[] = ["NEW", "CONTACTED", "BOOKED", "NOT_BOOKED", "SPAM"];

const STATUS_TONE: Record<InquiryStatus, string> = {
  NEW: "bg-[#f8eef2] text-[#800020]",
  CONTACTED: "bg-amber-50 text-amber-700",
  BOOKED: "bg-emerald-50 text-emerald-700",
  NOT_BOOKED: "bg-neutral-100 text-neutral-600",
  SPAM: "bg-red-50 text-red-700",
};

const AVAILABILITY_TONE: Record<string, string> = {
  AVAILABLE: "text-emerald-700",
  UNAVAILABLE: "text-amber-700",
  NEEDS_CONFIRMATION: "text-muted-foreground",
};

function datesLabel(row: InquiryRow): string {
  if (row.category === "hourly") {
    return [row.check_in, row.hourly_slot].filter(Boolean).join(" · ") || "Flexible";
  }
  if (row.check_in && row.check_out) return `${row.check_in} → ${row.check_out}`;
  return row.check_in || "Flexible";
}

export default function HostInquiriesPage() {
  const [rows, setRows] = useState<InquiryRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/inquiries");
    const json: { inquiries?: InquiryRow[] } = res.ok ? await res.json() : {};
    setRows(json.inquiries ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(id: string, status: InquiryStatus) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    await fetch("/api/inquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-brand text-3xl text-[#2b000a] sm:text-4xl">Inquiries</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Beddn organizes your guest inquiries with their requested dates and contact details —
          instead of random WhatsApp messages. Every lead here came through Beddn.
        </p>
      </div>

      {loading ? (
        <BeddnLoader label="Loading inquiries…" />
      ) : rows.length === 0 ? (
        <EmptyState
          image="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029363/empty-bookings_e7n8sb.png"
          title="No inquiries yet"
          subtitle="When guests check availability and send an inquiry, their leads appear here."
          size="sm"
        />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-2xl border bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-[#2b000a]">{row.guest_name}</p>
                    <Badge className={`rounded-full ${STATUS_TONE[row.status]} hover:opacity-100`}>
                      {row.status.replace("_", " ")}
                    </Badge>
                    <span className="rounded-full bg-[#f5f1f2] px-2 py-0.5 text-[11px] font-semibold text-[#6f6568]">
                      via {row.source}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {row.listing?.title || row.listing?.name || "Listing"}
                    {row.listing?.city ? ` · ${row.listing.city}` : ""}
                  </p>
                </div>
                <a
                  href={`https://wa.me/${row.guest_whatsapp.replace(/[^\d]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#1fb959]"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </div>

              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Requested</p>
                  <p className="font-medium">{datesLabel(row)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Guests</p>
                  <p className="font-medium">{row.guests_count}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Availability at inquiry
                  </p>
                  <p className={`font-medium ${AVAILABILITY_TONE[row.availability_status] ?? ""}`}>
                    {row.availability_status.replace(/_/g, " ").toLowerCase()}
                  </p>
                </div>
              </div>

              {row.message && (
                <p className="mt-3 rounded-xl bg-[#fbf7f8] px-3 py-2 text-sm text-muted-foreground">
                  “{row.message}”
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Mark as:</span>
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatus(row.id, status)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      row.status === status
                        ? "border-[#800020] bg-[#800020] text-white"
                        : "border-[#e3d3d9] bg-white text-[#2b000a] hover:bg-muted"
                    }`}
                  >
                    {status.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

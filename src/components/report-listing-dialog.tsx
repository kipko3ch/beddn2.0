"use client";

import { useState } from "react";
import { Flag, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { User } from "@supabase/supabase-js";
import { AuthDialog } from "@/components/auth-dialog";

interface ReportListingDialogProps {
  listingId: string;
  listingTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

const REPORT_REASONS = [
  {
    id: "inaccurate",
    label: "Inaccurate or misleading",
    desc: "Photos, location, amenities, or pricing do not match reality.",
  },
  {
    id: "scam",
    label: "Scam, fraud, or fake listing",
    desc: "Host requested off-platform payment, suspicious behavior, or fraudulent identity.",
  },
  {
    id: "safety",
    label: "Safety or security concern",
    desc: "Unsafe environment, harassment, hazard, or dangerous conditions.",
  },
  {
    id: "inappropriate",
    label: "Offensive or inappropriate content",
    desc: "Discriminatory language, explicit photos, or harassment.",
  },
  {
    id: "spam",
    label: "Spam or duplicate listing",
    desc: "Commercial advertising, repetitive listings, or irrelevant content.",
  },
  {
    id: "other",
    label: "Something else",
    desc: "Another issue not listed above.",
  },
];

export function ReportListingDialog({
  listingId,
  listingTitle,
  open,
  onOpenChange,
  user,
}: ReportListingDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>("inaccurate");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      setAuthOpen(true);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/listings/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          reason: selectedReason,
          detail: detail.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit report. Please try again.");
      }

      setSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    onOpenChange(false);
    // Reset state after animation completes
    setTimeout(() => {
      setSubmitted(false);
      setErrorMessage(null);
      setDetail("");
      setSelectedReason("inaccurate");
    }, 300);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md p-6 rounded-3xl bg-white sm:max-w-lg">
          {submitted ? (
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <DialogTitle className="text-2xl font-bold text-[#181113]">
                Report received
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground max-w-sm mx-auto">
                Thank you for helping keep the Beddn community safe. Our team investigates every
                report thoroughly and will take appropriate action.
              </DialogDescription>
              <div className="pt-2">
                <Button
                  onClick={handleClose}
                  className="rounded-full bg-[#800020] px-6 text-white hover:bg-merlot"
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-2 text-crimson">
                  <Flag className="h-5 w-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Community trust</span>
                </div>
                <DialogTitle className="text-xl font-bold text-[#181113] sm:text-2xl">
                  Report this listing
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Reporting <span className="font-semibold text-[#181113]">{listingTitle}</span>. All reports are strictly confidential.
                </DialogDescription>
              </DialogHeader>

              {errorMessage && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">
                  Why are you reporting this?
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {REPORT_REASONS.map((reason) => {
                    const isSelected = selectedReason === reason.id;
                    return (
                      <label
                        key={reason.id}
                        className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                          isSelected
                            ? "border-[#800020] bg-[#fbf7f8] shadow-xs"
                            : "border-neutral-200 hover:bg-neutral-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="reportReason"
                          value={reason.id}
                          checked={isSelected}
                          onChange={() => setSelectedReason(reason.id)}
                          className="mt-0.5 accent-[#800020]"
                        />
                        <div className="text-left">
                          <p className="text-sm font-semibold text-[#181113]">{reason.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{reason.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="report-detail" className="text-xs font-bold uppercase text-muted-foreground">
                  Additional details <span className="font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  id="report-detail"
                  rows={3}
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder="Provide any specific details or context that could help our team review this listing..."
                  className="w-full rounded-xl border border-neutral-300 p-3 text-sm focus:border-[#800020] focus:outline-none focus:ring-1 focus:ring-[#800020]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  className="rounded-full"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full bg-[#800020] px-6 font-bold text-white hover:bg-merlot disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting…
                    </span>
                  ) : (
                    "Submit report"
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
}

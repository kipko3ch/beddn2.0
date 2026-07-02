"use client";

import { useState, type ReactElement } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PLACEMENTS = [
  { value: "homepage_featured", label: "Homepage featured" },
  { value: "city_featured", label: "City featured" },
  { value: "category_featured", label: "Category featured" },
  { value: "search_boost", label: "Search boost" },
];

const CATEGORIES = [
  { value: "", label: "—" },
  { value: "hourly", label: "Hourly" },
  { value: "overnight", label: "Overnight" },
  { value: "experience", label: "Experience" },
];

const PAYMENT_STATUSES = [
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
  { value: "complimentary", label: "Complimentary" },
];

function isoDate(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const fieldClass =
  "h-11 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-crimson";

/**
 * Admin modal for featuring a listing. Posts a feature_listing action; the API
 * enforces slot limits and date validity. `children` is the trigger element.
 */
export function FeatureListingDialog({
  listingId,
  defaultCity = "",
  defaultCategory = "",
  onSaved,
  children,
}: {
  listingId: string;
  defaultCity?: string;
  defaultCategory?: string;
  onSaved?: () => void;
  children: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState("homepage_featured");
  const [city, setCity] = useState(defaultCity);
  const [category, setCategory] = useState(defaultCategory);
  const [startDate, setStartDate] = useState(isoDate(0));
  const [endDate, setEndDate] = useState(isoDate(30));
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [amount, setAmount] = useState("0");
  const [currency, setCurrency] = useState("KES");
  const [priority, setPriority] = useState("0");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setError("");
    setWorking(true);
    const response = await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "feature_listing",
        id: listingId,
        feature: {
          placement_type: placement,
          city: placement === "city_featured" ? city : city || null,
          category: placement === "category_featured" ? category : category || null,
          start_date: startDate,
          end_date: endDate,
          payment_status: paymentStatus,
          amount: Number(amount) || 0,
          currency: currency || "KES",
          priority: Number(priority) || 0,
        },
      }),
    });
    setWorking(false);
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error || "Could not create the featured placement.");
      return;
    }
    setOpen(false);
    onSaved?.();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children as ReactElement} />
      <DialogContent className="max-w-[min(100vw-1.5rem,520px)]">
        <DialogHeader>
          <DialogTitle className="text-[#2b000a]">Feature this listing</DialogTitle>
          <DialogDescription>
            Featured placements only show while the listing is active and within the date window.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="mb-1.5 block text-xs font-semibold">Placement type</Label>
            <select className={fieldClass} value={placement} onChange={(e) => setPlacement(e.target.value)}>
              {PLACEMENTS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs font-semibold">City</Label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Nairobi"
              className="h-11"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-semibold">Category</Label>
            <select className={fieldClass} value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs font-semibold">Start date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-11" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-semibold">End date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-11" />
          </div>

          <div>
            <Label className="mb-1.5 block text-xs font-semibold">Payment status</Label>
            <select
              className={fieldClass}
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
            >
              {PAYMENT_STATUSES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-semibold">Priority</Label>
            <Input
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="h-11"
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-xs font-semibold">Amount</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-11"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-semibold">Currency</Label>
            <Input value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-11" />
          </div>
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <DialogFooter>
          <Button
            onClick={save}
            disabled={working}
            className="rounded-full bg-[#800020] hover:bg-merlot"
          >
            {working ? "Saving…" : "Save placement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

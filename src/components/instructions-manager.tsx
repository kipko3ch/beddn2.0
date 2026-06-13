"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isSafeExternalUrl } from "@/lib/links";
import type { InstructionType, InstructionVisibility, ListingInstruction } from "@/lib/types";

const TYPES: { value: InstructionType; label: string }[] = [
  { value: "CHECK_IN", label: "Check-in" },
  { value: "HOUSE_RULE", label: "House rule" },
  { value: "ARRIVAL", label: "Arrival" },
  { value: "PARKING", label: "Parking" },
  { value: "WIFI", label: "Wi-Fi" },
  { value: "SECURITY", label: "Security" },
  { value: "LOCAL_TIP", label: "Local tip" },
  { value: "GROUP_LINK", label: "Group link" },
  { value: "WEBSITE_LINK", label: "Website link" },
  { value: "ACTIVITY", label: "Activity" },
  { value: "NOTE", label: "Note" },
  { value: "OTHER", label: "Other" },
];

const VIS: { value: InstructionVisibility; label: string }[] = [
  { value: "PUBLIC", label: "Public — everyone" },
  { value: "AFTER_LOGIN", label: "After login" },
  { value: "AFTER_INQUIRY", label: "After inquiry" },
  { value: "PRIVATE_TO_CONFIRMED", label: "Private (reserved)" },
];

const LINK_TYPES = new Set<InstructionType>(["GROUP_LINK", "WEBSITE_LINK"]);

/** Host/admin editor for a listing's stay instructions & experience links. */
export function InstructionsManager({ listingId }: { listingId: string }) {
  const [items, setItems] = useState<ListingInstruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [type, setType] = useState<InstructionType>("CHECK_IN");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [visibility, setVisibility] = useState<InstructionVisibility>("PUBLIC");

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/listings/${listingId}/instructions`);
    // The GET returns gated GuestInstructions; for editing we re-fetch full rows
    // via the same endpoint as the owner (server returns unlocked content to the
    // owner because they are signed in and own the listing).
    const json: { instructions?: ListingInstruction[] } = res.ok ? await res.json() : {};
    setItems((json.instructions ?? []) as ListingInstruction[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);

  async function add() {
    setError("");
    if (!title.trim()) {
      setError("Add a title.");
      return;
    }
    if (LINK_TYPES.has(type) && url && !isSafeExternalUrl(url)) {
      setError("That link is not allowed. Use a full http(s) URL.");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/listings/${listingId}/instructions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        title,
        description,
        url: LINK_TYPES.has(type) ? url : null,
        visibility,
        sort_order: items.length,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({ error: "" }));
      setError(json.error || "Could not save.");
      return;
    }
    setTitle("");
    setDescription("");
    setUrl("");
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/listings/${listingId}/instructions?instructionId=${id}`, { method: "DELETE" });
    await load();
  }

  const isLink = LINK_TYPES.has(type);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Type</Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as InstructionType)}
              className="mt-1 h-10 w-full rounded-lg border px-3 text-sm"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Who can see it</Label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as InstructionVisibility)}
              className="mt-1 h-10 w-full rounded-lg border px-3 text-sm"
            >
              {VIS.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="instr-title">Title</Label>
            <Input
              id="instr-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Gate code, WhatsApp group, Parking"
              className="mt-1 h-10"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="instr-desc">Details</Label>
            <Textarea
              id="instr-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Instructions or notes for the guest."
              className="mt-1"
            />
          </div>
          {isLink && (
            <div className="sm:col-span-2">
              <Label htmlFor="instr-url">Link URL</Label>
              <Input
                id="instr-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
                className="mt-1 h-10"
              />
            </div>
          )}
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <Button
          type="button"
          onClick={add}
          disabled={saving}
          className="mt-3 h-10 rounded-full bg-[#800020] px-5 font-semibold hover:bg-[#600018]"
        >
          <Plus className="mr-1 h-4 w-4" /> {saving ? "Saving…" : "Add instruction"}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Tip: keep general tips PUBLIC; put group links behind After login/After inquiry; keep exact
          access or security details to After inquiry. Don&apos;t put contact info that bypasses Beddn.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No instructions yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 rounded-xl border p-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#2b000a]">
                  {item.title}
                  <span className="ml-2 rounded-full bg-[#f5f1f2] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#6f6568]">
                    {item.type.replace(/_/g, " ")}
                  </span>
                  <span className="ml-1 rounded-full bg-[#f8eef2] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#800020]">
                    {item.visibility.replace(/_/g, " ")}
                  </span>
                </p>
                {item.description && (
                  <p className="mt-1 truncate text-xs text-muted-foreground">{item.description}</p>
                )}
                {item.url && <p className="truncate text-xs text-[#800020]">{item.url}</p>}
              </div>
              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label="Remove"
                className="shrink-0 rounded-full p-2 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DashboardListSkeleton } from "@/components/dashboard-skeletons";
import { Lightbulb } from "lucide-react";

type Req = {
  id: string;
  title: string;
  detail: string | null;
  status: string;
  created_at: string;
};

const STATUS_BADGE: Record<string, string> = {
  new: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  planned: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  shipped: "bg-green-100 text-green-800 hover:bg-green-100",
  declined: "bg-zinc-200 text-zinc-600 hover:bg-zinc-200",
};

export default function HostFeaturesPage() {
  const [requests, setRequests] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function load() {
    const res = await fetch("/api/feature-requests");
    const json = (await res.json().catch(() => ({}))) as { requests?: Req[] };
    setRequests(json.requests ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    const res = await fetch("/api/feature-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, detail }),
    });
    setSaving(false);
    if (!res.ok) {
      alert("Could not send your idea. Please try again.");
      return;
    }
    setTitle("");
    setDetail("");
    setDone(true);
    setTimeout(() => setDone(false), 3000);
    await load();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-brand text-3xl text-[#2b000a] sm:text-4xl">Suggest a feature</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell the Beddn team what would make hosting easier. We build for African hosts — your ideas
          shape what comes next.
        </p>
      </div>

      <form onSubmit={submit} className="mb-8 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="space-y-4">
          <div>
            <Label htmlFor="ft-title">Your idea</Label>
            <Input
              id="ft-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. M-Pesa payouts, or a WhatsApp broadcast to past guests"
              className="mt-1 h-11"
              required
            />
          </div>
          <div>
            <Label htmlFor="ft-detail">More detail (optional)</Label>
            <Textarea
              id="ft-detail"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
              placeholder="What problem would this solve for you?"
              className="mt-1"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button type="submit" disabled={saving} className="gap-1 rounded-full bg-[#800020] hover:bg-[#600018]">
            <Lightbulb className="h-4 w-4" /> {saving ? "Sending…" : "Send idea"}
          </Button>
          {done && <span className="text-sm font-medium text-[#128c4b]">Thanks — we got it!</span>}
        </div>
      </form>

      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[#a08b92]">Your ideas</h2>
      {loading ? (
        <DashboardListSkeleton rows={3} />
      ) : requests.length === 0 ? (
        <p className="rounded-2xl border bg-white p-4 text-sm text-muted-foreground">
          You haven&apos;t suggested anything yet. Your ideas will show here with their status.
        </p>
      ) : (
        <div className="divide-y rounded-2xl border bg-white">
          {requests.map((r) => (
            <div key={r.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-[#2b000a]">{r.title}</p>
                <Badge className={`text-xs capitalize ${STATUS_BADGE[r.status] ?? "bg-muted"}`}>
                  {r.status}
                </Badge>
              </div>
              {r.detail && <p className="mt-1 text-sm text-muted-foreground">{r.detail}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

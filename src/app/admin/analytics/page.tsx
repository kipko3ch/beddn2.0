"use client";

import { useEffect, useState } from "react";
import { BeddnLoader } from "@/components/beddn-loader";
import {
  Activity,
  CalendarCheck,
  Eye,
  Link2,
  MessageCircle,
} from "lucide-react";

interface Analytics {
  totals: {
    views: number;
    availabilityChecks: number;
    inquiries: number;
    whatsappClicks: number;
    linkClicks: number;
  };
  topListings: { id: string; name: string; inquiries: number; views: number }[];
  topCities: { city: string; inquiries: number }[];
  mostRequestedDates: { date: string; inquiries: number }[];
  highViewsLowInquiries: { id: string; name: string; views: number; inquiries: number }[];
}

const TOTAL_CARDS = [
  { key: "views", label: "Listing views", icon: Eye },
  { key: "availabilityChecks", label: "Availability checks", icon: CalendarCheck },
  { key: "inquiries", label: "Inquiries", icon: MessageCircle },
  { key: "whatsappClicks", label: "WhatsApp clicks", icon: Activity },
  { key: "linkClicks", label: "Link clicks", icon: Link2 },
] as const;

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: Analytics | null) => setData(json))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <BeddnLoader label="Loading analytics…" />;
  if (!data) return <p className="text-sm text-muted-foreground">Could not load analytics.</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Demand analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Proof Beddn generates the lead: views, availability checks, inquiries, WhatsApp clicks,
          and instruction/link clicks across the platform.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {TOTAL_CARDS.map(({ key, label, icon: Icon }) => (
          <div key={key} className="rounded-2xl border bg-white p-4">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#f8eef2] text-[#800020]">
              <Icon className="h-4 w-4" />
            </span>
            <p className="mt-3 text-2xl font-bold text-[#2b000a]">
              {data.totals[key].toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Top listings by inquiries">
          {data.topListings.length === 0 ? (
            <Empty />
          ) : (
            data.topListings.map((row) => (
              <Row key={row.id} label={row.name} value={`${row.inquiries} inq · ${row.views} views`} />
            ))
          )}
        </Panel>

        <Panel title="Top cities by inquiries">
          {data.topCities.length === 0 ? (
            <Empty />
          ) : (
            data.topCities.map((row) => (
              <Row key={row.city} label={row.city} value={`${row.inquiries}`} />
            ))
          )}
        </Panel>

        <Panel title="Most requested dates">
          {data.mostRequestedDates.length === 0 ? (
            <Empty />
          ) : (
            data.mostRequestedDates.map((row) => (
              <Row key={row.date} label={row.date} value={`${row.inquiries}`} />
            ))
          )}
        </Panel>

        <Panel title="High views, low inquiries">
          {data.highViewsLowInquiries.length === 0 ? (
            <Empty />
          ) : (
            data.highViewsLowInquiries.map((row) => (
              <Row key={row.id} label={row.name} value={`${row.views} views · 0 inq`} />
            ))
          )}
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#a08b92]">{title}</h2>
      <div className="divide-y">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <span className="min-w-0 truncate text-[#2b000a]">{label}</span>
      <span className="shrink-0 font-semibold text-muted-foreground">{value}</span>
    </div>
  );
}

function Empty() {
  return <p className="py-3 text-sm text-muted-foreground">No data yet.</p>;
}

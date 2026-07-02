"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  DoorOpen,
  ExternalLink,
  Info,
  Lock,
  MapPin,
  ParkingCircle,
  ScrollText,
  ShieldAlert,
  Sparkles,
  Users,
  Wifi,
} from "lucide-react";
import { EXTERNAL_LINK_ATTRS } from "@/lib/links";
import { track } from "@/lib/track";
import type { GuestInstruction, InstructionType } from "@/lib/types";

const TYPE_ICON: Record<InstructionType, React.ElementType> = {
  CHECK_IN: DoorOpen,
  HOUSE_RULE: ScrollText,
  ARRIVAL: MapPin,
  PARKING: ParkingCircle,
  WIFI: Wifi,
  SECURITY: ShieldAlert,
  LOCAL_TIP: Sparkles,
  GROUP_LINK: Users,
  WEBSITE_LINK: ExternalLink,
  ACTIVITY: Sparkles,
  NOTE: Info,
  OTHER: Info,
};

const LINK_TYPES = new Set<InstructionType>(["GROUP_LINK", "WEBSITE_LINK"]);

/**
 * "Stay Instructions & Experience" — public items show normally, locked items
 * show a preview that nudges the guest to log in / send an inquiry. The server
 * decides what content each guest may see (see api/listings/[id]/instructions).
 */
export function StayInstructions({ listingId }: { listingId: string }) {
  const [items, setItems] = useState<GuestInstruction[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/listings/${listingId}/instructions`)
      .then((res) => (res.ok ? res.json() : { instructions: [] }))
      .then((json: { instructions?: GuestInstruction[]; signedIn?: boolean }) => {
        if (!active) return;
        setItems(json.instructions ?? []);
        setSignedIn(Boolean(json.signedIn));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [listingId]);

  if (loaded && items.length === 0) return null;

  function onLinkClick(item: GuestInstruction) {
    track(item.type === "GROUP_LINK" ? "GROUP_LINK_CLICK" : "EXPERIENCE_LINK_CLICK", {
      listingId,
      metadata: { instruction_id: item.id, type: item.type },
    });
  }

  return (
    <section id="instructions">
      <h2 className="mb-1 text-xl font-bold">Stay Instructions &amp; Experience</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Host-provided guidance. Some details unlock after you log in or send an inquiry.
      </p>

      {!loaded ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => {
            const Icon = TYPE_ICON[item.type] ?? Info;
            const safeUrl = item.url;
            return (
              <div
                key={item.id}
                className={`rounded-2xl border p-4 ${item.locked ? "bg-[#faf7f8]" : "bg-white"}`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ${
                      item.locked ? "bg-[#efe7ea] text-[#9b8a90]" : "bg-[#f8eef2] text-crimson"
                    }`}
                  >
                    {item.locked ? <Lock className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#2b000a]">{item.title}</p>
                    {item.locked ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.visibility === "AFTER_INQUIRY"
                          ? "More instructions are available after you send an inquiry."
                          : item.visibility === "AFTER_LOGIN"
                          ? "Log in to view host instructions."
                          : "Available after your stay is confirmed."}
                      </p>
                    ) : (
                      <>
                        {item.description && (
                          <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                        {safeUrl && LINK_TYPES.has(item.type) && (
                          <a
                            href={safeUrl}
                            {...EXTERNAL_LINK_ATTRS}
                            onClick={() => onLinkClick(item)}
                            className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-crimson hover:underline"
                          >
                            {item.type === "GROUP_LINK" ? "Open group link" : "Open link"}
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!signedIn && items.some((i) => i.locked) && (
        <p className="mt-3 text-xs text-muted-foreground">
          Log in and send an inquiry through Beddn to unlock the host&apos;s full instructions.
        </p>
      )}
    </section>
  );
}

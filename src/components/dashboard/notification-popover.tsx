"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check, ExternalLink, ShieldCheck, Star, Calendar, MessageSquare, Megaphone, AlertCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";
import type { HostNotification } from "@/lib/types";

export function NotificationPopover({
  hostId,
  userEmail,
}: {
  hostId?: string;
  userEmail?: string;
}) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<HostNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

  async function loadNotifications() {
    if (!hostId) return;

    try {
      const { data } = await supabase
        .from("host_notifications")
        .select("*")
        .eq("host_id", hostId)
        .order("created_at", { ascending: false })
        .limit(20);

      const items = (data as HostNotification[]) || [];
      setNotifications(items);
      setUnreadCount(items.filter((n) => !n.is_read).length);
    } catch {
      // If table is still empty, no problem
    }
  }

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostId]);

  async function markAllRead() {
    if (!hostId || unreadCount === 0) return;
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await supabase
        .from("host_notifications")
        .update({ is_read: true })
        .eq("host_id", hostId);
    } catch {
      // ignore
    }
  }

  function getIcon(type: string) {
    switch (type) {
      case "listing_verified":
        return <ShieldCheck className="size-4 text-emerald-600" />;
      case "pro_activated":
        return <Star className="size-4 text-amber-500" />;
      case "booking_requested":
      case "booking_confirmed":
        return <Calendar className="size-4 text-[#800020]" />;
      case "inquiry_new":
        return <MessageSquare className="size-4 text-blue-600" />;
      case "announcement":
        return <Megaphone className="size-4 text-[#800020]" />;
      default:
        return <AlertCircle className="size-4 text-stone-500" />;
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex size-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white outline-none"
        >
          <Bell className="size-4.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-[#2b000a] animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      } />
      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[min(92vw,360px)] overflow-hidden rounded-3xl border border-stone-200 bg-white p-0 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-stone-100 bg-[#fbf7f8] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-brand text-base font-bold text-[#2b000a]">Notifications</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-[#fdf2f4] px-2 py-0.5 text-[10px] font-bold text-[#800020] border border-[#f9c8d4]">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-[11px] font-bold text-[#800020] hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-stone-100 p-1">
          {notifications.length === 0 ? (
            <div className="py-10 text-center px-4">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400 mb-2">
                <Bell className="size-6" />
              </div>
              <p className="text-sm font-semibold text-stone-700">No notifications yet</p>
              <p className="text-xs text-stone-500 mt-0.5">
                Updates about bookings, inquiries, and verified badges will appear here.
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-3 transition rounded-2xl ${
                  item.is_read ? "opacity-75 hover:opacity-100" : "bg-[#fdf2f4]/40"
                }`}
              >
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-white border border-stone-200 shadow-2xs">
                  {getIcon(item.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-stone-900 leading-tight">{item.title}</p>
                  <p className="text-xs text-stone-600 mt-0.5 leading-snug line-clamp-2">{item.message}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[10px] text-stone-400">
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {item.link && (
                      <Link
                        href={item.link}
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#800020] hover:underline"
                      >
                        View <ExternalLink className="size-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

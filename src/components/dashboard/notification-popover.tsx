"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  Calendar,
  MessageSquare,
  Megaphone,
  AlertCircle,
  ArrowRight,
  Star,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import type { HostNotification } from "@/lib/types";

export function NotificationPopover({
  hostId,
  userEmail,
}: {
  hostId?: string;
  userEmail?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<HostNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  async function loadNotifications() {
    try {
      const res = await fetch("/api/host/notifications");
      if (res.ok) {
        const data = await res.json();
        const items = (data.notifications as HostNotification[]) || [];
        setNotifications(items);
        setUnreadCount(data.unreadCount || items.filter((n) => !n.is_read).length);
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadNotifications();
  }, [hostId]);

  async function markAllRead() {
    if (unreadCount === 0) return;
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await fetch("/api/host/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    } catch {
      // ignore
    }
  }

  async function handleNotificationClick(item: HostNotification) {
    if (!item.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      void fetch("/api/host/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, is_read: true }),
      });
    }
    setOpen(false);
    if (item.link) {
      router.push(item.link);
    } else {
      router.push(`/host/notifications?id=${item.id}`);
    }
  }

  function getIcon(type: string) {
    switch (type) {
      case "listing_verified":
        return <VerifiedBadge variant="icon" size="xs" />;
      case "pro_activated":
      case "pro_expiring":
        return <Star className="size-4 text-amber-500 fill-amber-500" />;
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
        className="w-[min(92vw,380px)] overflow-hidden rounded-3xl border border-stone-200 bg-white p-0 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-stone-100 bg-[#fbf7f8] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-brand text-base font-bold text-[#2b000a]">Notifications</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-[#fdf2f4] px-2 py-0.5 text-[10px] font-bold text-[#800020] border border-[#f9a8d4]">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[11px] font-bold text-[#800020] hover:underline"
              >
                Mark all read
              </button>
            )}
            <Link
              href="/host/notifications"
              onClick={() => setOpen(false)}
              className="text-[11px] font-bold text-stone-600 hover:text-[#800020]"
            >
              Full Page
            </Link>
          </div>
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
                onClick={() => handleNotificationClick(item)}
                className={`flex items-start gap-3 p-3 transition rounded-2xl cursor-pointer ${
                  item.is_read ? "opacity-75 hover:opacity-100 hover:bg-stone-50" : "bg-[#fdf2f4]/50 hover:bg-[#fdf2f4]/80"
                }`}
              >
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-white border border-stone-200 shadow-2xs">
                  {getIcon(item.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-bold text-stone-900 leading-tight truncate">{item.title}</p>
                    {!item.is_read && <span className="size-1.5 rounded-full bg-[#800020] shrink-0" />}
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5 leading-snug line-clamp-2">{item.message}</p>
                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-stone-400">
                    <span>
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="font-bold text-[#800020] hover:underline inline-flex items-center gap-0.5">
                      Open <ArrowRight className="size-2.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Link to Dedicated Page */}
        <div className="border-t border-stone-100 bg-[#fbf7f8] p-2.5 text-center">
          <Link
            href="/host/notifications"
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#800020] hover:underline py-0.5"
          >
            <span>Open Notifications Center</span>
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

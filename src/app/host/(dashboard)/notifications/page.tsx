"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  Calendar,
  MessageSquare,
  Megaphone,
  AlertCircle,
  ExternalLink,
  Trash2,
  Filter,
  ArrowRight,
  Sparkles,
  Star,
} from "lucide-react";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { Button } from "@/components/ui/button";
import type { HostNotification } from "@/lib/types";

type NotificationCategory = "all" | "unread" | "bookings" | "inquiries" | "promotions" | "announcements";

export default function HostNotificationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("id");

  const [notifications, setNotifications] = useState<HostNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function loadNotifications() {
    try {
      setLoading(true);
      const res = await fetch("/api/host/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.warn("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function handleMarkAsRead(id: string, currentReadState: boolean) {
    setProcessingId(id);
    const newRead = !currentReadState;
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: newRead } : n))
    );
    setUnreadCount((prev) => (newRead ? Math.max(0, prev - 1) : prev + 1));

    try {
      await fetch("/api/host/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_read: newRead }),
      });
    } catch {
      // ignore
    } finally {
      setProcessingId(null);
    }
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

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

  async function handleDelete(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await fetch(`/api/host/notifications?id=${id}`, {
        method: "DELETE",
      });
    } catch {
      // ignore
    }
  }

  async function handleClearAllRead() {
    setNotifications((prev) => prev.filter((n) => !n.is_read));
    try {
      await fetch("/api/host/notifications?clearRead=1", {
        method: "DELETE",
      });
    } catch {
      // ignore
    }
  }

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (activeCategory === "unread") return !item.is_read;
      if (activeCategory === "bookings")
        return item.type.includes("booking");
      if (activeCategory === "inquiries")
        return item.type.includes("inquiry");
      if (activeCategory === "promotions")
        return item.type.includes("pro") || item.type.includes("verified");
      if (activeCategory === "announcements")
        return item.type === "announcement";
      return true;
    });
  }, [notifications, activeCategory]);

  function getNotificationIcon(type: string) {
    switch (type) {
      case "listing_verified":
        return <VerifiedBadge variant="icon" size="sm" />;
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

  function getActionLabel(type: string, link?: string | null) {
    if (!link) return "View Details";
    if (link.includes("bookings")) return "Review Booking Request";
    if (link.includes("inquiries")) return "View Guest Inquiry";
    if (link.includes("listings")) return "View My Listings";
    if (link.includes("pro")) return "View Membership";
    return "Open Page";
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-brand text-2xl sm:text-3xl font-extrabold text-[#2b000a] tracking-tight">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#fdf2f4] px-3 py-0.5 text-xs font-bold text-[#800020] border border-[#f9a8d4]">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Stay on top of guest bookings, traveler inquiries, verified listing updates, and platform announcements.
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-bold text-stone-700 hover:border-[#800020] hover:text-[#800020] shadow-2xs transition"
            >
              <CheckCheck className="size-3.5 text-[#800020]" />
              <span>Mark all read</span>
            </button>
          )}

          {notifications.some((n) => n.is_read) && (
            <button
              type="button"
              onClick={handleClearAllRead}
              className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-500 hover:text-stone-800 shadow-2xs transition"
            >
              <Trash2 className="size-3" />
              <span>Clear read</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none]">
        {[
          { id: "all", label: "All" },
          { id: "unread", label: `Unread (${unreadCount})` },
          { id: "bookings", label: "Bookings" },
          { id: "inquiries", label: "Inquiries" },
          { id: "promotions", label: "Badges & Tiers" },
          { id: "announcements", label: "Announcements" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveCategory(tab.id as NotificationCategory)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold whitespace-nowrap transition-all ${
              activeCategory === tab.id
                ? "bg-[#800020] text-white shadow-xs"
                : "bg-white border border-stone-200/80 text-stone-600 hover:text-stone-900 hover:bg-stone-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-3xl border border-stone-200/80 bg-white p-5 flex items-start gap-4"
              >
                <div className="size-10 rounded-2xl bg-stone-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded-md bg-stone-200/80" />
                  <div className="h-3 w-3/4 rounded-md bg-stone-200/60" />
                  <div className="h-3 w-32 rounded-md bg-stone-200/50 pt-1" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="rounded-3xl border border-stone-200/90 bg-white p-12 text-center max-w-lg mx-auto shadow-xs space-y-3">
            <div className="size-14 rounded-2xl bg-[#fdf2f4] text-[#800020] flex items-center justify-center mx-auto">
              <Bell className="size-7 text-[#800020]" />
            </div>
            <h3 className="font-brand text-lg font-bold text-stone-900">
              {activeCategory === "unread" ? "No unread notifications" : "No notifications in this section"}
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 leading-relaxed max-w-sm mx-auto">
              {activeCategory === "unread"
                ? "You're all caught up! New booking requests, messages, and platform updates will appear here."
                : "You will receive real-time notifications here as soon as guests book, inquire, or when your listings are verified."}
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const isHighlighted = highlightId === item.id;
            return (
              <article
                key={item.id}
                className={`group relative rounded-3xl border p-5 sm:p-6 transition-all duration-300 ${
                  isHighlighted
                    ? "ring-2 ring-[#800020] border-[#800020] bg-[#fdf2f4]/30 shadow-md"
                    : item.is_read
                    ? "border-stone-200/90 bg-white shadow-xs hover:border-[#800020]/30 hover:shadow-sm"
                    : "border-[#f9c8d4] bg-[#fdf2f4]/40 shadow-xs hover:border-[#800020]/50"
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    {/* Icon container */}
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white border border-stone-200/90 shadow-2xs">
                      {getNotificationIcon(item.type)}
                    </div>

                    {/* Text Body */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-brand text-base sm:text-lg font-bold text-stone-900 leading-snug">
                          {item.title}
                        </h2>
                        {!item.is_read && (
                          <span className="flex size-2 rounded-full bg-[#800020] shrink-0" title="Unread" />
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-stone-600 leading-relaxed whitespace-pre-line">
                        {item.message}
                      </p>

                      <div className="pt-2 flex flex-wrap items-center gap-3 text-[11px] text-stone-400">
                        <span>
                          {new Date(item.created_at).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span>·</span>
                        <span className="capitalize">{item.type.replace(/_/g, " ")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions column */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0">
                    {item.link && (
                      <Link
                        href={item.link}
                        onClick={() => {
                          if (!item.is_read) handleMarkAsRead(item.id, false);
                        }}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#800020] px-4 text-xs font-bold text-white hover:bg-[#68001a] shadow-2xs transition active:scale-98"
                      >
                        <span>{getActionLabel(item.type, item.link)}</span>
                        <ArrowRight className="size-3.5" />
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(item.id, item.is_read)}
                      disabled={processingId === item.id}
                      className="rounded-full border border-stone-200 bg-white p-2 text-stone-500 hover:text-stone-900 hover:border-stone-400 shadow-2xs transition"
                      title={item.is_read ? "Mark as unread" : "Mark as read"}
                      aria-label={item.is_read ? "Mark as unread" : "Mark as read"}
                    >
                      <Check className={`size-4 ${item.is_read ? "text-stone-400" : "text-[#800020]"}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="rounded-full border border-stone-200 bg-white p-2 text-stone-400 hover:text-rose-600 hover:border-rose-300 shadow-2xs transition"
                      title="Delete notification"
                      aria-label="Delete notification"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

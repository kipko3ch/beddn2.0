"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { InquiryFlow, type InquiryDraft } from "@/components/inquiry-flow";
import { track } from "@/lib/track";
import {
  Compass,
  MapPin,
  Clock,
  Users,
  Star,
  Share2,
  Heart,
  Calendar,
  AlertCircle,
  X,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Map } from "@/components/map";
import { useSavedListings } from "@/lib/hooks";
import { useCurrency } from "@/components/currency-provider";
import { LOGO_SRC } from "@/lib/assets";
import type { Listing, Review } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ExperienceContent({
  listing,
  reviews,
  isOwnListing = false,
}: {
  listing: Listing & { availability_slots?: any[] };
  reviews: Review[];
  isOwnListing?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [shared, setShared] = useState(false);

  const { savedIds, toggle } = useSavedListings();
  const { formatPrice } = useCurrency();
  const isSaved = savedIds.has(listing.id);

  // Load user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [supabase]);

  // Analytics view count
  useEffect(() => {
    track("LISTING_VIEW", { listingId: listing.id });
  }, [listing.id]);

  const images = listing.listing_images?.length
    ? listing.listing_images
    : [{ id: "fallback", listing_id: listing.id, url: LOGO_SRC, position: 0 }];

  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  // Generate date choices for the next 30 days based on weekly available_days
  const dateChoices = useMemo(() => {
    const choices: Date[] = [];
    const days = listing.available_days || [0, 1, 2, 3, 4, 5, 6];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      if (days.includes(date.getDay())) {
        choices.push(date);
      }
    }
    return choices;
  }, [listing.available_days]);

  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    dateChoices[0] ? dateChoices[0].toISOString().split("T")[0] : ""
  );

  // Check custom availability slots for the selected date
  const slotsForSelectedDate = useMemo(() => {
    if (!listing.availability_slots || !selectedDateStr) return [];
    return listing.availability_slots.filter((slot) => {
      const start = slot.start_datetime?.split("T")[0];
      return start === selectedDateStr && slot.available_units > 0;
    });
  }, [listing.availability_slots, selectedDateStr]);

  const [selectedSlotId, setSelectedSlotId] = useState<string>("");

  useEffect(() => {
    if (slotsForSelectedDate.length > 0) {
      setSelectedSlotId(slotsForSelectedDate[0].id || `${slotsForSelectedDate[0].start_datetime}`);
    } else {
      setSelectedSlotId("");
    }
  }, [slotsForSelectedDate]);

  // Standard generic session time choices if no database slots exist
  const standardTimeChoices = ["09:00 AM", "10:00 AM", "01:00 PM", "02:00 PM", "05:00 PM"];
  const [selectedStandardTime, setSelectedStandardTime] = useState(standardTimeChoices[1]);

  const [guests, setGuests] = useState("1");

  const ticketPrice = Number(listing.experience_price || 0);
  const totalPrice = ticketPrice * parseInt(guests);

  async function shareProperty() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = listing.title || listing.name;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: `Check out ${title} on Beddn`, url });
        return;
      } catch {
        /* user dismissed */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      /* ignore */
    }
  }

  // Pre-fill inquiry draft details for the chat
  const inquiryDraft = useMemo<InquiryDraft>(() => {
    let sessionTime = selectedStandardTime;
    if (selectedSlotId && slotsForSelectedDate.length > 0) {
      const match = slotsForSelectedDate.find((s) => s.id === selectedSlotId || `${s.start_datetime}` === selectedSlotId);
      if (match) {
        const start = match.start_datetime?.split("T")[1]?.slice(0, 5) || "";
        const end = match.end_datetime?.split("T")[1]?.slice(0, 5) || "";
        sessionTime = `${start} - ${end}`;
      }
    }
    return {
      category: "experience" as any,
      checkIn: selectedDateStr,
      checkOut: selectedDateStr,
      hourlySlot: sessionTime,
      guests: Number(guests) || 1,
      availabilityStatus: selectedDateStr ? "AVAILABLE" : "NEEDS_CONFIRMATION",
    };
  }, [selectedDateStr, selectedSlotId, slotsForSelectedDate, selectedStandardTime, guests]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-12">
      {/* Title & Metadata Header */}
      <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-[#8A1C32] text-white hover:bg-[#4E1424] flex items-center gap-1.5 py-1 px-4 rounded-full font-bold text-xs uppercase tracking-wide">
              <Compass className="h-3.5 w-3.5" /> Experience
            </Badge>
            {listing.experience_types?.slice(0, 3).map((type) => (
              <Badge key={type} variant="outline" className="border-[#FCDCD3] text-[#4E1424] rounded-full py-0.5 px-3 font-semibold text-xs capitalize">
                {type}
              </Badge>
            ))}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#2B0A11] sm:text-5xl leading-tight">
            {listing.title || listing.name}
          </h1>
          <p className="flex items-center gap-2 text-sm font-semibold text-zinc-500">
            <MapPin className="h-4 w-4 text-[#8A1C32]" />
            {listing.area}, {listing.city}, {listing.country}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={shareProperty}
            className="rounded-full border-[#FCDCD3] text-[#4E1424] hover:bg-[#FFEBE5] h-11 px-6 font-semibold"
          >
            <Share2 className="mr-2 h-4 w-4" />
            {shared ? "Copied!" : "Share"}
          </Button>
          <Button
            variant="outline"
            onClick={() => toggle(listing.id)}
            className="rounded-full border-[#FCDCD3] text-[#4E1424] hover:bg-[#FFEBE5] h-11 px-6 font-semibold"
          >
            <Heart className={`mr-2 h-4 w-4 ${isSaved ? "fill-[#8A1C32] text-[#8A1C32]" : ""}`} />
            {isSaved ? "Saved" : "Save"}
          </Button>
        </div>
      </div>

      {/* Single Large, Elegant Hero Image */}
      <div className="relative overflow-hidden rounded-[2rem] border border-[#FCDCD3] bg-white shadow-sm mb-12 aspect-[21/9] w-full min-h-[350px] max-h-[550px]">
        <Image
          src={images[0]?.url}
          alt={listing.name}
          fill
          priority
          className="object-cover cursor-pointer hover:scale-[1.01] transition-transform duration-500"
          onClick={() => setLightboxIndex(0)}
        />
        {images.length > 1 && (
          <button
            onClick={() => setLightboxIndex(0)}
            className="absolute bottom-6 right-6 rounded-full border border-[#FCDCD3] bg-white/95 backdrop-blur-sm px-6 py-3 text-xs font-bold text-[#4E1424] shadow-md hover:bg-[#FFEBE5] transition duration-200"
          >
            Show all {images.length} photos
          </button>
        )}
      </div>

      {/* Details & Sidebar Grid (Spacious 2fr 1fr split) */}
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[2fr_1fr]">
        
        {/* Left Column: Core Info & Highlights */}
        <div className="space-y-12">
          {/* Highlights Row */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-[#FCDCD3] bg-[#FFEBE5]/20 p-5 text-center transition hover:bg-[#FFEBE5]/30">
              <Clock className="mx-auto h-7 w-7 text-[#8A1C32] mb-1.5" />
              <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">Duration</p>
              <p className="text-base font-extrabold text-[#2B0A11] mt-0.5">
                {listing.experience_duration || "3 hours"}
              </p>
            </div>
            <div className="rounded-2xl border border-[#FCDCD3] bg-[#FFEBE5]/20 p-5 text-center transition hover:bg-[#FFEBE5]/30">
              <Users className="mx-auto h-7 w-7 text-[#8A1C32] mb-1.5" />
              <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">Group size</p>
              <p className="text-base font-extrabold text-[#2B0A11] mt-0.5">
                Up to {listing.experience_group_size || 10} guests
              </p>
            </div>
            <div className="rounded-2xl border border-[#FCDCD3] bg-[#FFEBE5]/20 p-5 text-center transition hover:bg-[#FFEBE5]/30">
              <Compass className="mx-auto h-7 w-7 text-[#8A1C32] mb-1.5" />
              <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">Activity</p>
              <p className="text-base font-extrabold text-[#2B0A11] mt-0.5 truncate capitalize">
                {listing.experience_types?.[0] || "Guided tour"}
              </p>
            </div>
            <div className="rounded-2xl border border-[#FCDCD3] bg-[#FFEBE5]/20 p-5 text-center transition hover:bg-[#FFEBE5]/30">
              <Star className="mx-auto h-7 w-7 text-[#8A1C32] mb-1.5" />
              <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">Rating</p>
              <p className="text-base font-extrabold text-[#2B0A11] mt-0.5">
                {reviews.length > 0 ? avgRating.toFixed(1) : "New"}
              </p>
            </div>
          </div>

          <Separator className="bg-[#FCDCD3]/60" />

          {/* Description */}
          <div className="space-y-4">
            <h2 className="text-2xl font-extrabold text-[#2B0A11]">What we will do</h2>
            <div className="text-base leading-relaxed text-zinc-700 whitespace-pre-line font-medium text-[16px]">
              {listing.description || "No description provided."}
            </div>
          </div>

          {/* Requirements Box */}
          {listing.experience_requirements && (
            <>
              <Separator className="bg-[#FCDCD3]/60" />
              <div className="rounded-2xl border border-[#FCDCD3] bg-[#FFEBE5]/20 p-6 space-y-3">
                <h3 className="text-sm font-bold text-[#8A1C32] flex items-center gap-2 uppercase tracking-wide">
                  <AlertCircle className="h-5 w-5" /> Guest Requirements
                </h3>
                <p className="text-sm text-[#4E1424] leading-relaxed whitespace-pre-line font-semibold text-[15px]">
                  {listing.experience_requirements}
                </p>
              </div>
            </>
          )}

          {/* What to bring */}
          {listing.house_rules && (
            <>
              <Separator className="bg-[#FCDCD3]/60" />
              <div className="space-y-4">
                <h2 className="text-2xl font-extrabold text-[#2B0A11]">What to bring / Special guidelines</h2>
                <div className="text-base leading-relaxed text-zinc-700 whitespace-pre-line font-medium text-[16px]">
                  {listing.house_rules}
                </div>
              </div>
            </>
          )}

          <Separator className="bg-[#FCDCD3]/60" />

          {/* Meeting Point & Map */}
          <div className="space-y-4">
            <h2 className="text-2xl font-extrabold text-[#2B0A11]">Where we will meet</h2>
            <p className="text-sm font-semibold text-zinc-600">
              Meeting point: <span className="text-[#8A1C32]">{listing.experience_meeting_point || "Shared upon booking"}</span>
            </p>
            <div className="h-[320px] overflow-hidden rounded-3xl border border-[#FCDCD3] shadow-inner mt-4">
              <Map
                listings={[listing as any]}
                center={[listing.longitude, listing.latitude]}
                zoom={14}
                approximate
                interactive={false}
              />
            </div>
          </div>

          <Separator className="bg-[#FCDCD3]/60" />

          {/* Host Card */}
          <div className="flex gap-5 items-center bg-[#FFEBE5]/10 p-6 rounded-3xl border border-[#FCDCD3]">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-full border border-[#FCDCD3] bg-zinc-50 shadow-sm">
              {listing.host?.avatar_url ? (
                <Image
                  src={listing.host.avatar_url}
                  alt={listing.host.name || ""}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#FFEBE5] text-2xl font-bold text-[#8A1C32]">
                  {listing.host?.name?.charAt(0) || "?"}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#8A1C32] uppercase tracking-wider flex items-center gap-1">
                Your Host & Guide
                {listing.host?.is_verified && (
                  <BadgeCheck className="h-4 w-4 text-[#8A1C32]" />
                )}
              </p>
              <h4 className="text-lg font-extrabold text-[#2B0A11]">
                {listing.host?.name || "Jane Doe"}
              </h4>
              <p className="text-sm text-zinc-600 leading-relaxed max-w-md">
                {listing.host?.bio || "A friendly guide eager to share unique local insights."}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Ticket Booking Widget Sidebar */}
        <div className="h-fit rounded-3xl border border-[#FCDCD3] bg-white p-6 sm:p-8 shadow-md space-y-6 lg:sticky lg:top-28">
          <div className="space-y-1">
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">TICKET PRICE</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-[#2B0A11]">
                {formatPrice(ticketPrice, listing.currency || "KES")}
              </span>
              <span className="text-sm font-semibold text-zinc-500">/ guest</span>
            </div>
          </div>

          <Separator className="bg-[#FCDCD3]/50" />

          <div className="space-y-5">
            {/* 1. Date select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#4E1424] uppercase tracking-wider block">
                Select Date
              </label>
              <Select value={selectedDateStr} onValueChange={(val) => setSelectedDateStr(val || "")}>
                <SelectTrigger className="border-[#FCDCD3] rounded-xl h-12 bg-zinc-50 font-semibold text-[#2B0A11] focus:ring-1 focus:ring-[#8A1C32]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateChoices.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No dates available
                    </SelectItem>
                  ) : (
                    dateChoices.map((date) => {
                      const iso = date.toISOString().split("T")[0];
                      const formatted = date.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      });
                      return (
                        <SelectItem key={iso} value={iso}>
                          {formatted}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Session / Time select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#4E1424] uppercase tracking-wider block">
                Session Start Time
              </label>
              {slotsForSelectedDate.length > 0 ? (
                <Select value={selectedSlotId} onValueChange={(val) => setSelectedSlotId(val || "")}>
                  <SelectTrigger className="border-[#FCDCD3] rounded-xl h-12 bg-zinc-50 font-semibold text-[#2B0A11] focus:ring-1 focus:ring-[#8A1C32]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {slotsForSelectedDate.map((slot) => {
                      const start = slot.start_datetime?.split("T")[1]?.slice(0, 5) || "";
                      const end = slot.end_datetime?.split("T")[1]?.slice(0, 5) || "";
                      const id = slot.id || `${slot.start_datetime}`;
                      return (
                        <SelectItem key={id} value={id}>
                          {start} - {end} ({slot.available_units} seats left)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={selectedStandardTime} onValueChange={(val) => setSelectedStandardTime(val || "")}>
                  <SelectTrigger className="border-[#FCDCD3] rounded-xl h-12 bg-zinc-50 font-semibold text-[#2B0A11] focus:ring-1 focus:ring-[#8A1C32]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {standardTimeChoices.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time} (Standard Slot)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* 3. Number of tickets select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#4E1424] uppercase tracking-wider block">
                Tickets / Seats
              </label>
              <Select value={guests} onValueChange={(val) => setGuests(val || "1")}>
                <SelectTrigger className="border-[#FCDCD3] rounded-xl h-12 bg-zinc-50 font-semibold text-[#2B0A11] focus:ring-1 focus:ring-[#8A1C32]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: Math.min(12, listing.experience_group_size || 10) }).map(
                    (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {i + 1} ticket{i === 0 ? "" : "s"}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="bg-[#FCDCD3]/50" />

          {/* Pricing calculations */}
          <div className="space-y-3 font-semibold text-[#4E1424]">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">
                {formatPrice(ticketPrice, listing.currency || "KES")} x {guests} tickets
              </span>
              <span>{formatPrice(totalPrice, listing.currency || "KES")}</span>
            </div>
            <div className="flex justify-between border-t border-[#FCDCD3]/60 pt-3 text-base font-extrabold text-[#2B0A11]">
              <span>Total Price</span>
              <span>{formatPrice(totalPrice, listing.currency || "KES")}</span>
            </div>
          </div>

          {/* Booking CTA Button */}
          <div className="pt-2">
            {isOwnListing ? (
              <Link
                href={`/host/listings/${listing.id}/edit`}
                className="w-full flex h-12 items-center justify-center rounded-full bg-[#8A1C32] font-bold text-white hover:bg-[#4E1424] transition shadow-sm text-sm uppercase tracking-wider"
              >
                Manage Experience
              </Link>
            ) : (
              <Button
                onClick={() => setInquiryOpen(true)}
                className="w-full h-12 rounded-full bg-[#8A1C32] font-bold hover:bg-[#4E1424] text-white shadow-sm text-sm uppercase tracking-wider"
              >
                Book Tickets
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox photo viewer overlay */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-black/95 animate-fade-in" role="dialog">
          <div className="flex items-center justify-between p-6 text-white">
            <span className="text-sm font-bold">
              {lightboxIndex + 1} / {images.length}
            </span>
            <button
              onClick={() => setLightboxIndex(null)}
              className="flex size-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="relative flex-1">
            <Image
              src={images[lightboxIndex]?.url}
              alt=""
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}

      {/* Inquiry modal sheet */}
      {!isOwnListing && (
        <InquiryFlow
          listing={{
            id: listing.id,
            name: listing.name,
            title: listing.title,
            slug: listing.slug,
            image: images[0]?.url ?? null,
          }}
          user={user}
          draft={inquiryDraft}
          open={inquiryOpen}
          onOpenChange={setInquiryOpen}
        />
      )}
    </main>
  );
}

"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Clock,
  Copy,
  ExternalLink,
  Lock,
  MapPin,
  Phone,
} from "lucide-react";

interface BookingData {
  id: string;
  token: string;
  guest_name: string;
  guest_phone: string;
  check_in: string;
  check_out: string | null;
  start_time: string | null;
  duration_hours: number | null;
  guests: number;
  note: string | null;
  category: string;
  status: string;
  total_amount: number;
  created_at: string;
  listing: {
    id: string;
    name: string;
    slug: string;
    city: string;
    area: string;
    country: string;
    latitude: number;
    longitude: number;
    private_address: string | null;
    listing_images: { url: string; position: number }[];
  };
  host_phone: string | null;
  host_name: string;
}

export default function BookingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const supabase = createClient();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.rpc("get_booking_by_token", {
        booking_token: token,
      });
      setBooking(data as BookingData);
      setLoading(false);
    }
    load();
  }, [token]);

  function copyToken() {
    navigator.clipboard.writeText(booking?.token ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openWhatsApp() {
    if (!booking?.host_phone) return;
    const msg = encodeURIComponent(
      `Hi ${booking.host_name}, I have a booking at ${booking.listing.name} (ref: ${booking.token}) on ${booking.check_in}. Confirming my reservation.`
    );
    window.open(`https://wa.me/${booking.host_phone.replace(/\D/g, "")}?text=${msg}`);
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 animate-pulse">
        <div className="h-6 w-1/2 bg-muted rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-5 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">Booking not found</p>
      </div>
    );
  }

  const isPaid = booking.status === "paid" || booking.status === "completed";

  return (
    <main className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-4">
        {isPaid ? (
          <CheckCircle className="h-6 w-6 text-green-600" />
        ) : (
          <Clock className="h-6 w-6 text-yellow-600" />
        )}
        <h1 className="text-xl font-bold">
          {isPaid ? "Booking confirmed" : "Booking pending payment"}
        </h1>
      </div>

      {/* Token */}
      <div className="flex items-center gap-2 mb-6">
        <code className="bg-muted px-3 py-1.5 rounded text-lg font-mono font-bold">
          {booking.token}
        </code>
        <Button variant="ghost" size="sm" onClick={copyToken}>
          <Copy className="h-4 w-4" />
          {copied ? " Copied" : ""}
        </Button>
      </div>

      <div className="border rounded-xl p-5 space-y-4">
        <div>
          <h2 className="font-semibold">{booking.listing.name}</h2>
          <p className="text-sm text-muted-foreground">
            {booking.listing.area}, {booking.listing.city},{" "}
            {booking.listing.country}
          </p>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Guest</span>
            <p className="font-medium">{booking.guest_name}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Type</span>
            <p>
              <Badge variant="secondary">{booking.category}</Badge>
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">
              {booking.category === "experience" ? "Date" : "Check-in"}
            </span>
            <p className="font-medium">{booking.check_in}</p>
          </div>
          {booking.check_out && (
            <div>
              <span className="text-muted-foreground">Check-out</span>
              <p className="font-medium">{booking.check_out}</p>
            </div>
          )}
          {booking.start_time && (
            <div>
              <span className="text-muted-foreground">Time</span>
              <p className="font-medium">{booking.start_time}</p>
            </div>
          )}
          {booking.duration_hours && (
            <div>
              <span className="text-muted-foreground">Duration</span>
              <p className="font-medium">{booking.duration_hours}h</p>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Guests</span>
            <p className="font-medium">{booking.guests}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Total</span>
            <p className="font-semibold">
              ${Number(booking.total_amount).toLocaleString()}
            </p>
          </div>
        </div>

        {booking.note && (
          <>
            <Separator />
            <div>
              <span className="text-sm text-muted-foreground">Note</span>
              <p className="text-sm">{booking.note}</p>
            </div>
          </>
        )}

        <Separator />

        {/* Private info — only shown if paid */}
        {isPaid ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-green-600" />
              <div>
                <span className="text-sm text-muted-foreground">Address</span>
                <p className="text-sm font-medium">
                  {booking.listing.private_address}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 mt-0.5 text-green-600" />
              <div>
                <span className="text-sm text-muted-foreground">
                  Host phone
                </span>
                <p className="text-sm font-medium">{booking.host_phone}</p>
              </div>
            </div>
            <Button onClick={openWhatsApp} className="w-full gap-2" variant="outline">
              <ExternalLink className="h-4 w-4" /> Message host on WhatsApp
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <Lock className="h-4 w-4" />
            <span>
              Address and host contact will be revealed after payment is confirmed.
            </span>
          </div>
        )}
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Map } from "@/components/map";
import { Star, MapPin, Clock, Moon, Compass, Shield, Heart } from "lucide-react";
import type { Listing, Review } from "@/lib/types";

export default function PropertyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [listing, setListing] = useState<Listing | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    async function load() {
      const { data: listingData } = await supabase
        .from("listings")
        .select("*, listing_images(*), host:hosts(name, is_verified)")
        .eq("slug", slug)
        .eq("is_active", true)
        .eq("is_verified", true)
        .single();

      if (!listingData) {
        setLoading(false);
        return;
      }

      setListing(listingData as Listing);

      const [reviewsRes, blockedRes] = await Promise.all([
        supabase
          .from("reviews")
          .select("*, profile:profiles(full_name)")
          .eq("listing_id", listingData.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("blocked_dates")
          .select("date")
          .eq("listing_id", listingData.id),
      ]);

      setReviews((reviewsRes.data as Review[]) ?? []);
      setBlockedDates(
        (blockedRes.data ?? []).map((d: { date: string }) => new Date(d.date))
      );
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 w-1/2 bg-muted rounded mb-4" />
        <div className="aspect-[16/9] bg-muted rounded-xl" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground text-lg">Listing not found</p>
      </div>
    );
  }

  const images = listing.listing_images ?? [];
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      {/* Title */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">{listing.name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <MapPin className="h-4 w-4" />
            {listing.area}, {listing.city}, {listing.country}
            {reviews.length > 0 && (
              <>
                <span className="mx-1">·</span>
                <Star className="h-4 w-4 fill-current text-yellow-500" />
                {avgRating.toFixed(1)} ({reviews.length} review{reviews.length !== 1 ? "s" : ""})
              </>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm">
          <Heart className="h-4 w-4 mr-1" /> Save
        </Button>
      </div>

      {/* Images */}
      {images.length > 0 && (
        <div className="mb-6">
          <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-muted">
            <Image
              src={images[selectedImage]?.url ?? ""}
              alt={listing.name}
              fill
              className="object-cover"
              priority
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-2 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(i)}
                  className={`relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 ${
                    i === selectedImage ? "border-[#800020]" : "border-transparent"
                  }`}
                >
                  <Image src={img.url} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Categories */}
          <div className="flex gap-2">
            {listing.categories.map((cat) => {
              const Icon =
                cat === "hourly" ? Clock : cat === "overnight" ? Moon : Compass;
              return (
                <Badge key={cat} variant="secondary" className="gap-1">
                  <Icon className="h-3 w-3" /> {cat}
                </Badge>
              );
            })}
            {listing.host?.is_verified && (
              <Badge variant="outline" className="gap-1">
                <Shield className="h-3 w-3" /> Verified host
              </Badge>
            )}
          </div>

          {/* Description */}
          {listing.description && (
            <div>
              <h2 className="font-semibold mb-2">About this place</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {listing.description}
              </p>
            </div>
          )}

          <Separator />

          {/* Amenities */}
          {listing.amenities.length > 0 && (
            <div>
              <h2 className="font-semibold mb-2">Amenities</h2>
              <div className="grid grid-cols-2 gap-2">
                {listing.amenities.map((a) => (
                  <span key={a} className="text-sm text-muted-foreground">
                    • {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* House rules */}
          {listing.house_rules && (
            <div>
              <h2 className="font-semibold mb-2">House rules</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {listing.house_rules}
              </p>
            </div>
          )}

          <Separator />

          {/* Calendar */}
          <div>
            <h2 className="font-semibold mb-2">Availability</h2>
            <Calendar
              mode="single"
              disabled={blockedDates}
              className="rounded-md border w-fit"
            />
          </div>

          <Separator />

          {/* Reviews */}
          <div>
            <h2 className="font-semibold mb-3">
              Reviews{" "}
              {reviews.length > 0 && (
                <span className="text-muted-foreground font-normal">
                  · {avgRating.toFixed(1)} avg ({reviews.length})
                </span>
              )}
            </h2>
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < review.rating
                                ? "fill-yellow-500 text-yellow-500"
                                : "text-muted"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {(review as Review & { profile?: { full_name?: string | null } }).profile?.full_name ?? "Guest"}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No reviews yet</p>
            )}
          </div>

          <Separator />

          {/* Map (approximate) */}
          <div>
            <h2 className="font-semibold mb-2">Approximate location</h2>
            <p className="text-xs text-muted-foreground mb-2">
              Exact address is shared after booking is confirmed and paid.
            </p>
            <div className="h-64 rounded-xl overflow-hidden border">
              <Map
                listings={[listing]}
                center={[listing.longitude, listing.latitude]}
                zoom={13}
                approximate
              />
            </div>
          </div>
        </div>

        {/* Booking sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 border rounded-xl p-6 space-y-4">
            <div className="space-y-1">
              {listing.hourly_price && (
                <div className="flex justify-between text-sm">
                  <span>Hourly</span>
                  <span className="font-semibold">
                    ${Number(listing.hourly_price).toLocaleString()}/hr
                  </span>
                </div>
              )}
              {listing.overnight_price && (
                <div className="flex justify-between text-sm">
                  <span>Overnight</span>
                  <span className="font-semibold">
                    ${Number(listing.overnight_price).toLocaleString()}/night
                  </span>
                </div>
              )}
              {listing.experience_price && (
                <div className="flex justify-between text-sm">
                  <span>Experience</span>
                  <span className="font-semibold">
                    ${Number(listing.experience_price).toLocaleString()}/session
                  </span>
                </div>
              )}
              {listing.deposit_amount > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Deposit</span>
                  <span>${Number(listing.deposit_amount).toLocaleString()}</span>
                </div>
              )}
            </div>
            <Button
              onClick={() => router.push(`/reserve/${listing.id}`)}
              className="w-full bg-[#800020] hover:bg-[#600018]"
              size="lg"
            >
              Reserve
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              You won&apos;t be charged yet
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

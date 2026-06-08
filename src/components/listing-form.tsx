"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadListingImage } from "@/lib/upload-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { MapPinPicker } from "@/components/map-pin-picker";
import type { Listing, ListingCategory } from "@/lib/types";

const AMENITY_OPTIONS = [
  "WiFi",
  "Parking",
  "Air conditioning",
  "Kitchen",
  "TV",
  "Pool",
  "Hot water",
  "Security",
  "Generator",
  "Garden",
  "Balcony",
  "Workspace",
];

interface ListingFormProps {
  listing?: Listing;
  hostId?: string;
  isAdmin?: boolean;
}

export function ListingForm({ listing, hostId, isAdmin }: ListingFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState(listing?.name ?? "");
  const [description, setDescription] = useState(listing?.description ?? "");
  const [country, setCountry] = useState(listing?.country ?? "");
  const [city, setCity] = useState(listing?.city ?? "");
  const [area, setArea] = useState(listing?.area ?? "");
  const [privateAddress, setPrivateAddress] = useState(listing?.private_address ?? "");
  const [checkInInstructions, setCheckInInstructions] = useState(
    listing?.check_in_instructions ?? ""
  );
  const [latitude, setLatitude] = useState(listing?.latitude ?? -1.29);
  const [longitude, setLongitude] = useState(listing?.longitude ?? 36.82);
  const [currency, setCurrency] = useState(listing?.currency ?? "KES");
  const [totalUnits, setTotalUnits] = useState(
    listing?.total_units?.toString() ?? "1"
  );
  const [bookingMode, setBookingMode] = useState(
    listing?.booking_mode ?? "manual_accept"
  );
  const [minimumHours, setMinimumHours] = useState(
    listing?.minimum_hours?.toString() ?? "1"
  );
  const [checkInTime, setCheckInTime] = useState(listing?.check_in_time ?? "");
  const [checkOutTime, setCheckOutTime] = useState(listing?.check_out_time ?? "");
  const [categories, setCategories] = useState<ListingCategory[]>(
    (listing?.categories as ListingCategory[]) ?? []
  );
  const [hourlyPrice, setHourlyPrice] = useState(
    listing?.hourly_price?.toString() ?? ""
  );
  const [overnightPrice, setOvernightPrice] = useState(
    listing?.overnight_price?.toString() ?? ""
  );
  const [experiencePrice, setExperiencePrice] = useState(
    listing?.experience_price?.toString() ?? ""
  );
  const [depositAmount, setDepositAmount] = useState(
    listing?.deposit_amount?.toString() ?? "0"
  );
  const [platformFeeType, setPlatformFeeType] = useState(
    listing?.platform_fee_type ?? "fixed"
  );
  const [platformFeeValue, setPlatformFeeValue] = useState(
    listing?.platform_fee_value?.toString() ?? "0"
  );
  const [amenities, setAmenities] = useState<string[]>(listing?.amenities ?? []);
  const [houseRules, setHouseRules] = useState(listing?.house_rules ?? "");
  const [isActive, setIsActive] = useState(listing?.is_active ?? true);
  const [isVerified, setIsVerified] = useState(listing?.is_verified ?? false);
  const [imageUrls, setImageUrls] = useState(
    listing?.listing_images?.map((img) => img.url).join("\n") ?? ""
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleImageFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError("");
    setUploading(true);
    try {
      // Upload sequentially so a slow connection doesn't fire many at once.
      for (const file of Array.from(files)) {
        const url = await uploadListingImage(file);
        setImageUrls((prev) => (prev.trim() ? `${prev.trim()}\n${url}` : url));
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function toggleCategory(cat: ListingCategory) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function toggleAmenity(amenity: string) {
    setAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity]
    );
  }

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const payload = {
      host_id: listing?.host_id ?? hostId,
      slug: listing?.slug ?? generateSlug(name) + "-" + Date.now().toString(36),
      title: name,
      name,
      description: description || null,
      country,
      city,
      area,
      private_address: privateAddress,
      check_in_instructions: checkInInstructions || null,
      latitude,
      longitude,
      categories,
      category: categories,
      hourly_price: hourlyPrice ? parseFloat(hourlyPrice) : null,
      overnight_price: overnightPrice ? parseFloat(overnightPrice) : null,
      experience_price: experiencePrice ? parseFloat(experiencePrice) : null,
      deposit_amount: parseFloat(depositAmount || "0"),
      currency,
      total_units: Math.max(1, parseInt(totalUnits || "1")),
      available_units: Math.max(1, parseInt(totalUnits || "1")),
      booking_mode: isAdmin ? bookingMode : listing?.booking_mode ?? "manual_accept",
      verification_status: isAdmin && isVerified ? "verified" : listing?.verification_status ?? "pending",
      listing_status: isActive ? "active" : "paused",
      platform_fee_type: platformFeeType,
      platform_fee_value: parseFloat(platformFeeValue || "0"),
      minimum_hours: Math.max(1, parseInt(minimumHours || "1")),
      check_in_time: checkInTime || null,
      check_out_time: checkOutTime || null,
      amenities,
      house_rules: houseRules || null,
      is_active: isActive,
      is_verified: isAdmin ? isVerified : listing?.is_verified ?? false,
      updated_at: new Date().toISOString(),
    };

    let listingId = listing?.id;

    if (listing) {
      const { error } = await supabase
        .from("listings")
        .update(payload)
        .eq("id", listing.id);
      if (error) {
        alert("Failed to update listing: " + error.message);
        setSubmitting(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("listings")
        .insert(payload)
        .select("id")
        .single();
      if (error || !data) {
        alert("Failed to create listing: " + (error?.message ?? "Unknown error"));
        setSubmitting(false);
        return;
      }
      listingId = data.id;
    }

    // Update images
    if (listingId) {
      await supabase
        .from("listing_images")
        .delete()
        .eq("listing_id", listingId);

      const urls = imageUrls
        .split("\n")
        .map((u) => u.trim())
        .filter(Boolean);
      if (urls.length > 0) {
        await supabase.from("listing_images").insert(
          urls.map((url, i) => ({
            listing_id: listingId,
            url,
            position: i,
          }))
        );
      }
    }

    router.push("/dashboard/listings");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Listing name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="country">Country *</Label>
          <Input
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="area">Area *</Label>
          <Input
            id="area"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="privateAddress">Private address *</Label>
          <Input
            id="privateAddress"
            value={privateAddress}
            onChange={(e) => setPrivateAddress(e.target.value)}
            required
            placeholder="Exact address (hidden until paid)"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="instructions">Private check-in instructions</Label>
          <Textarea
            id="instructions"
            value={checkInInstructions}
            onChange={(e) => setCheckInInstructions(e.target.value)}
            rows={2}
            placeholder="Shown only after a booking is confirmed"
          />
        </div>
      </div>

      <Separator />

      {/* Location picker */}
      <div>
        <Label>Location *</Label>
        <div className="grid grid-cols-2 gap-4 mb-2">
          <div>
            <Label htmlFor="lat" className="text-xs text-muted-foreground">
              Latitude
            </Label>
            <Input
              id="lat"
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(parseFloat(e.target.value))}
              required
            />
          </div>
          <div>
            <Label htmlFor="lng" className="text-xs text-muted-foreground">
              Longitude
            </Label>
            <Input
              id="lng"
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(parseFloat(e.target.value))}
              required
            />
          </div>
        </div>
        <MapPinPicker
          latitude={latitude}
          longitude={longitude}
          onChange={(lat, lng) => {
            setLatitude(lat);
            setLongitude(lng);
          }}
        />
      </div>

      <Separator />

      {/* Categories */}
      <div>
        <Label>Categories *</Label>
        <div className="flex gap-4 mt-2">
          {(["hourly", "overnight", "experience"] as ListingCategory[]).map(
            (cat) => (
              <label key={cat} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={categories.includes(cat)}
                  onCheckedChange={() => toggleCategory(cat)}
                />
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </label>
            )
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Currency</Label>
          <Select value={currency} onValueChange={(value) => value && setCurrency(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="KES">KES</SelectItem>
              <SelectItem value="TZS">TZS</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="units">Rooms/units/seats</Label>
          <Input
            id="units"
            type="number"
            min="1"
            value={totalUnits}
            onChange={(e) => setTotalUnits(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="minimumHours">Minimum hours</Label>
          <Input
            id="minimumHours"
            type="number"
            min="1"
            value={minimumHours}
            onChange={(e) => setMinimumHours(e.target.value)}
          />
        </div>
        <div>
          <Label>Booking mode</Label>
          <Select
            value={bookingMode}
            onValueChange={(value) =>
              value && setBookingMode(value as "manual_accept" | "auto_accept")
            }
            disabled={!isAdmin}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual_accept">Manual accept</SelectItem>
              <SelectItem value="auto_accept">Auto accept</SelectItem>
            </SelectContent>
          </Select>
          {!isAdmin && (
            <p className="text-xs text-muted-foreground mt-1">
              Admin approval is required for auto accept.
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="checkInTime">Check-in time</Label>
          <Input
            id="checkInTime"
            type="time"
            value={checkInTime}
            onChange={(e) => setCheckInTime(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="checkOutTime">Check-out time</Label>
          <Input
            id="checkOutTime"
            type="time"
            value={checkOutTime}
            onChange={(e) => setCheckOutTime(e.target.value)}
          />
        </div>
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {categories.includes("hourly") && (
          <div>
            <Label htmlFor="hourlyPrice">Hourly price ($)</Label>
            <Input
              id="hourlyPrice"
              type="number"
              step="0.01"
              value={hourlyPrice}
              onChange={(e) => setHourlyPrice(e.target.value)}
            />
          </div>
        )}
        {categories.includes("overnight") && (
          <div>
            <Label htmlFor="overnightPrice">Overnight price ($)</Label>
            <Input
              id="overnightPrice"
              type="number"
              step="0.01"
              value={overnightPrice}
              onChange={(e) => setOvernightPrice(e.target.value)}
            />
          </div>
        )}
        {categories.includes("experience") && (
          <div>
            <Label htmlFor="experiencePrice">Experience price ($)</Label>
            <Input
              id="experiencePrice"
              type="number"
              step="0.01"
              value={experiencePrice}
              onChange={(e) => setExperiencePrice(e.target.value)}
            />
          </div>
        )}
        <div>
          <Label htmlFor="deposit">Deposit amount ($)</Label>
          <Input
            id="deposit"
            type="number"
            step="0.01"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />
        </div>
        <div>
          <Label>Platform fee type</Label>
          <Select
            value={platformFeeType}
            onValueChange={(value) =>
              value && setPlatformFeeType(value as "fixed" | "percentage")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Fixed</SelectItem>
              <SelectItem value="percentage">Percentage</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="platformFeeValue">Platform fee value</Label>
          <Input
            id="platformFeeValue"
            type="number"
            step="0.01"
            value={platformFeeValue}
            onChange={(e) => setPlatformFeeValue(e.target.value)}
          />
        </div>
      </div>

      <Separator />

      {/* Description */}
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />
      </div>

      {/* Amenities */}
      <div>
        <Label>Amenities</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
          {AMENITY_OPTIONS.map((amenity) => (
            <label key={amenity} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={amenities.includes(amenity)}
                onCheckedChange={() => toggleAmenity(amenity)}
              />
              {amenity}
            </label>
          ))}
        </div>
      </div>

      {/* House rules */}
      <div>
        <Label htmlFor="rules">House rules</Label>
        <Textarea
          id="rules"
          value={houseRules}
          onChange={(e) => setHouseRules(e.target.value)}
          rows={3}
        />
      </div>

      <Separator />

      {/* Images */}
      <div className="space-y-2">
        <Label htmlFor="image-files">Photos</Label>
        <input
          id="image-files"
          type="file"
          accept="image/*"
          multiple
          disabled={uploading}
          onChange={(e) => {
            handleImageFiles(e.target.files);
            e.target.value = ""; // allow re-selecting the same file
          }}
          className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-[#800020] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#600018] disabled:opacity-60"
        />
        <p className="text-xs text-muted-foreground">
          Photos are compressed to about 250&nbsp;KB in your browser before
          upload. Add as many as you like.
        </p>
        {uploading && (
          <p className="text-xs font-medium text-[#800020]">Uploading…</p>
        )}
        {uploadError && (
          <p className="text-xs font-medium text-red-600">{uploadError}</p>
        )}

        <Label htmlFor="images" className="pt-2">
          Image URLs (one per line)
        </Label>
        <Textarea
          id="images"
          value={imageUrls}
          onChange={(e) => setImageUrls(e.target.value)}
          rows={4}
          placeholder="Uploaded photos appear here. You can also paste image URLs."
        />
      </div>

      <Separator />

      {/* Status */}
      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={isActive}
            onCheckedChange={(v) => setIsActive(v === true)}
          />
          Active (visible when verified)
        </label>
        {isAdmin && (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={isVerified}
              onCheckedChange={(v) => setIsVerified(v === true)}
            />
            Verified (admin only)
          </label>
        )}
      </div>

      <Button
        type="submit"
        disabled={submitting || !name || !country || !city || !area || categories.length === 0}
        className="bg-[#800020] hover:bg-[#600018]"
        size="lg"
      >
        {submitting
          ? "Saving..."
          : listing
          ? "Update listing"
          : "Create listing"}
      </Button>
    </form>
  );
}

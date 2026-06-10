"use client";

import { useMemo, useState } from "react";
import type { ElementType } from "react";
import { useRouter } from "next/navigation";
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
import { LocationPicker } from "@/components/location-picker";
import { AmenityPicker } from "@/components/amenity-picker";
import { AmenityIcon } from "@/components/amenity-icon";
import { CopyGuide } from "@/components/copy-guide";
import { AiPromptHelper } from "@/components/ai-prompt-helper";
import { Clock, Compass, Moon, Search, ChevronLeft } from "lucide-react";
import { PROPERTY_TYPES, PROPERTY_TYPE_LABEL } from "@/lib/property-types";
import { AMENITY_LABEL } from "@/lib/amenities";
import { EXPERIENCE_GROUPS, EXPERIENCE_LABEL } from "@/lib/experience-types";
import type { Listing, ListingCategory } from "@/lib/types";

const CATEGORY_OPTIONS: {
  value: ListingCategory;
  label: string;
  description: string;
  icon: ElementType;
}[] = [
  {
    value: "hourly",
    label: "Hourly stay",
    description: "Rooms, workspaces, or private places booked by the hour.",
    icon: Clock,
  },
  {
    value: "overnight",
    label: "Overnight stay",
    description: "Homes, rooms, or suites guests can book for the night.",
    icon: Moon,
  },
  {
    value: "experience",
    label: "Experience",
    description: "Trips, classes, sessions, tours, and other bookable activities.",
    icon: Compass,
  },
];

const CATEGORY_LABEL: Record<ListingCategory, string> = {
  hourly: "Hourly stay",
  overnight: "Overnight stay",
  experience: "Experience",
};

const DESCRIPTION_GUIDE = `Tucked in a quiet corner of [area], this [property type] is perfect for [who it suits — couples, remote workers, families].

You'll love: [the best feature — e.g. the rooftop view, the fast WiFi, the calm].

The space: [number of rooms/beds, what's included, the vibe].

Getting around: [nearby landmarks, how easy it is to reach town/airport].

Booking is simple — pick your dates and reserve with your phone number.`;

const RULES_GUIDE = `• Check-in after [time], check-out before [time]
• No parties or loud music after [time]
• Smoking only [allowed/outside/not allowed]
• Pets [allowed/not allowed]
• Please treat the space like your own home`;

const CHECKIN_GUIDE = `When you arrive at [landmark], call [name] on the number shared after booking.
The gate code is [____]. Your unit is [floor/door].
Wifi name: [____]  •  Password: [____]`;

interface ListingFormProps {
  listing?: Listing;
  hostId?: string;
  isAdmin?: boolean;
}

export function ListingForm({ listing, hostId, isAdmin }: ListingFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);

  const [name, setName] = useState(listing?.name ?? "");
  const [description, setDescription] = useState(listing?.description ?? "");
  const [country, setCountry] = useState(listing?.country ?? "");
  const [city, setCity] = useState(listing?.city ?? "");
  const [area, setArea] = useState(listing?.area ?? "");
  const [propertyType, setPropertyType] = useState(listing?.property_type ?? "");
  const [experienceTypes, setExperienceTypes] = useState<string[]>(
    listing?.experience_types ?? []
  );
  const [experienceSearch, setExperienceSearch] = useState("");
  const [privateAddress, setPrivateAddress] = useState(listing?.private_address ?? "");
  const [checkInInstructions, setCheckInInstructions] = useState(
    listing?.check_in_instructions ?? ""
  );
  const [latitude, setLatitude] = useState(listing?.latitude ?? -1.29);
  const [longitude, setLongitude] = useState(listing?.longitude ?? 36.82);
  const [currency, setCurrency] = useState(listing?.currency ?? "KES");
  const [totalUnits, setTotalUnits] = useState(listing?.total_units?.toString() ?? "1");
  const [bookingMode, setBookingMode] = useState(listing?.booking_mode ?? "manual_accept");
  const [minimumHours, setMinimumHours] = useState(listing?.minimum_hours?.toString() ?? "1");
  const [checkInTime, setCheckInTime] = useState(listing?.check_in_time ?? "");
  const [checkOutTime, setCheckOutTime] = useState(listing?.check_out_time ?? "");
  const [categories, setCategories] = useState<ListingCategory[]>(
    (listing?.categories as ListingCategory[]) ?? []
  );
  const [hourlyPrice, setHourlyPrice] = useState(listing?.hourly_price?.toString() ?? "");
  const [overnightPrice, setOvernightPrice] = useState(
    listing?.overnight_price?.toString() ?? ""
  );
  const [experiencePrice, setExperiencePrice] = useState(
    listing?.experience_price?.toString() ?? ""
  );
  const [platformFeeType, setPlatformFeeType] = useState(listing?.platform_fee_type ?? "fixed");
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
  const [propertySearch, setPropertySearch] = useState("");

  async function handleImageFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError("");
    setUploading(true);
    try {
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

  function toggleExperienceType(value: string) {
    setExperienceTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  const isExperience = categories.includes("experience");

  function generateSlug(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  const aiFacts = {
    name,
    propertyTypeLabel: PROPERTY_TYPE_LABEL[propertyType] ?? "",
    bookingKinds: categories.map((c) => CATEGORY_LABEL[c]),
    country,
    region: city,
    village: area,
    amenityLabels: amenities.map((a) => AMENITY_LABEL[a] ?? a),
    units: totalUnits,
  };

  const filteredPropertyTypes = useMemo(() => {
    const q = propertySearch.trim().toLowerCase();
    if (!q) return PROPERTY_TYPES;
    return PROPERTY_TYPES.filter(
      (p) => p.label.toLowerCase().includes(q) || p.value.includes(q)
    );
  }, [propertySearch]);

  // --- Wizard steps ---------------------------------------------------------
  const steps: { title: string; subtitle?: string; valid: boolean; content: React.ReactNode }[] = [];

  steps.push({
    title: "What's the name of your place?",
    subtitle: "A short, inviting title guests will see first.",
    valid: name.trim().length > 1,
    content: (
      <div>
        <Label htmlFor="name">Listing name</Label>
        <Input
          id="name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sunny 1-bed in Kilimani"
          className="mt-2 h-12 text-base"
        />
      </div>
    ),
  });

  steps.push({
    title: "How can guests book it?",
    subtitle: "Pick one or more. You can be booked by the hour, the night, or as an experience.",
    valid: categories.length > 0,
    content: (
      <div className="grid gap-3 sm:grid-cols-3">
        {CATEGORY_OPTIONS.map(({ value, label, description, icon: Icon }) => {
          const selected = categories.includes(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => toggleCategory(value)}
              className={`min-h-36 rounded-2xl border p-4 text-left transition ${
                selected
                  ? "border-[#800020] bg-[#fbf7f8] shadow-sm"
                  : "border-border bg-white hover:border-[#d7a9b7]"
              }`}
              aria-pressed={selected}
            >
              <span
                className={`mb-3 inline-flex size-9 items-center justify-center rounded-full ${
                  selected ? "bg-[#800020] text-white" : "bg-muted text-[#2b000a]"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="block text-sm font-bold text-[#181113]">{label}</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                {description}
              </span>
            </button>
          );
        })}
      </div>
    ),
  });

  steps.push({
    title: "What kind of place is it?",
    subtitle: "Choose the property type. Search if you don't see it right away.",
    valid: propertyType.length > 0,
    content: (
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={propertySearch}
            onChange={(e) => setPropertySearch(e.target.value)}
            placeholder="Search type (villa, studio, hostel…)"
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {filteredPropertyTypes.map((p) => {
            const selected = propertyType === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setPropertyType(p.value)}
                aria-pressed={selected}
                className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm transition ${
                  selected
                    ? "border-[#800020] bg-[#fbf7f8] font-medium text-[#2b000a]"
                    : "border-border bg-white hover:border-[#d7a9b7]"
                }`}
              >
                <AmenityIcon
                  icon={p.icon}
                  width={22}
                  height={22}
                  className={selected ? "text-[#800020]" : "text-muted-foreground"}
                />
                <span className="min-w-0 flex-1 truncate">{p.label}</span>
              </button>
            );
          })}
          {filteredPropertyTypes.length === 0 && (
            <p className="col-span-full rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              No types match “{propertySearch}”.
            </p>
          )}
        </div>
      </div>
    ),
  });

  if (isExperience) {
    const q = experienceSearch.trim().toLowerCase();
    steps.push({
      title: "What kind of experience is it?",
      subtitle:
        "Pick everything you offer — guests can find you by activity. Search to filter the list.",
      valid: experienceTypes.length > 0,
      content: (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={experienceSearch}
              onChange={(e) => setExperienceSearch(e.target.value)}
              placeholder="Search experiences (safari, yoga, cooking…)"
              className="pl-9"
            />
          </div>
          {experienceTypes.length > 0 && (
            <p className="text-xs font-medium text-[#800020]">
              {experienceTypes.length} selected
            </p>
          )}
          <div className="space-y-5">
            {EXPERIENCE_GROUPS.map((group) => {
              const items = group.items.filter(
                (it) =>
                  !q ||
                  it.label.toLowerCase().includes(q) ||
                  it.value.includes(q)
              );
              if (items.length === 0) return null;
              return (
                <div key={group.group}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.group}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {items.map((it) => {
                      const selected = experienceTypes.includes(it.value);
                      return (
                        <button
                          key={it.value}
                          type="button"
                          onClick={() => toggleExperienceType(it.value)}
                          aria-pressed={selected}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm transition ${
                            selected
                              ? "border-[#800020] bg-[#fbf7f8] font-medium text-[#2b000a]"
                              : "border-border bg-white hover:border-[#d7a9b7]"
                          }`}
                        >
                          <AmenityIcon
                            icon={it.icon}
                            width={22}
                            height={22}
                            className={selected ? "text-[#800020]" : "text-muted-foreground"}
                          />
                          <span className="min-w-0 flex-1 truncate">{it.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ),
    });
  }

  steps.push({
    title: "Where is it?",
    subtitle: "Pick country → region → district → area, then drag the pin to the exact spot.",
    valid: country.trim().length > 0 && city.trim().length > 0 && area.trim().length > 0,
    content: (
      <div className="space-y-4">
        <LocationPicker
          latitude={latitude}
          longitude={longitude}
          initialCountryCode={undefined}
          onPlaceChange={(place) => {
            if (place.country) setCountry(place.country);
            setCity(place.region || "");
            setArea(place.village || place.district || "");
          }}
          onCoordsChange={(lat, lng) => {
            setLatitude(lat);
            setLongitude(lng);
          }}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="country" className="text-xs text-muted-foreground">
              Country (saved)
            </Label>
            <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="city" className="text-xs text-muted-foreground">
              City / Region (saved)
            </Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="area" className="text-xs text-muted-foreground">
              Area (saved)
            </Label>
            <Input id="area" value={area} onChange={(e) => setArea(e.target.value)} />
          </div>
        </div>
      </div>
    ),
  });

  steps.push({
    title: "Exact address & arrival",
    subtitle: "Private details — shared with a guest only after a confirmed booking.",
    valid: privateAddress.trim().length > 0,
    content: (
      <div className="space-y-4">
        <div>
          <Label htmlFor="privateAddress">Private address</Label>
          <Input
            id="privateAddress"
            value={privateAddress}
            onChange={(e) => setPrivateAddress(e.target.value)}
            placeholder="Building, street, unit/house number"
          />
        </div>
        <div>
          <Label htmlFor="instructions">Check-in instructions</Label>
          <Textarea
            id="instructions"
            value={checkInInstructions}
            onChange={(e) => setCheckInInstructions(e.target.value)}
            rows={3}
            placeholder="Shown only after a booking is confirmed"
          />
          <CopyGuide title="See a check-in example you can copy" text={CHECKIN_GUIDE} />
        </div>
      </div>
    ),
  });

  steps.push({
    title: "Capacity & timing",
    subtitle: "How many units and when guests can come and go.",
    valid: true,
    content: (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="units">Rooms / units / seats</Label>
          <Input
            id="units"
            type="number"
            min="1"
            value={totalUnits}
            onChange={(e) => setTotalUnits(e.target.value)}
          />
        </div>
        {categories.includes("hourly") && (
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
        )}
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
    ),
  });

  steps.push({
    title: "Pricing",
    subtitle: "Set the rates for the booking types you chose.",
    valid: true,
    content: (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Currency</Label>
          <Select value={currency} onValueChange={(value) => value && setCurrency(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="KES">KES</SelectItem>
              <SelectItem value="TZS">TZS</SelectItem>
              <SelectItem value="UGX">UGX</SelectItem>
              <SelectItem value="RWF">RWF</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {categories.includes("hourly") && (
          <div>
            <Label htmlFor="hourlyPrice">Hourly price</Label>
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
            <Label htmlFor="overnightPrice">Overnight price</Label>
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
            <Label htmlFor="experiencePrice">Experience price</Label>
            <Input
              id="experiencePrice"
              type="number"
              step="0.01"
              value={experiencePrice}
              onChange={(e) => setExperiencePrice(e.target.value)}
            />
          </div>
        )}
      </div>
    ),
  });

  steps.push({
    title: "Describe the space",
    subtitle: "Tell guests what makes it special. Copy the guide or generate it with ChatGPT.",
    valid: true,
    content: (
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          placeholder="Write a warm, honest description…"
        />
        <CopyGuide text={DESCRIPTION_GUIDE} />
        <AiPromptHelper facts={aiFacts} />
      </div>
    ),
  });

  steps.push({
    title: "What does the place offer?",
    subtitle: "Add every amenity guests will enjoy. Search to find them fast.",
    valid: true,
    content: <AmenityPicker value={amenities} onChange={setAmenities} />,
  });

  steps.push({
    title: "House rules",
    subtitle: "Set expectations so stays go smoothly.",
    valid: true,
    content: (
      <div>
        <Label htmlFor="rules">House rules</Label>
        <Textarea
          id="rules"
          value={houseRules}
          onChange={(e) => setHouseRules(e.target.value)}
          rows={5}
        />
        <CopyGuide title="See house-rules examples you can copy" text={RULES_GUIDE} />
      </div>
    ),
  });

  steps.push({
    title: "Add photos",
    subtitle: "Great photos get more bookings. Add as many as you like.",
    valid: true,
    content: (
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
            e.target.value = "";
          }}
          className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-[#800020] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#600018] disabled:opacity-60"
        />
        <p className="text-xs text-muted-foreground">
          Photos are compressed to about 250&nbsp;KB in your browser before upload.
        </p>
        {uploading && <p className="text-xs font-medium text-[#800020]">Uploading…</p>}
        {uploadError && <p className="text-xs font-medium text-red-600">{uploadError}</p>}
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
    ),
  });

  if (isAdmin) {
    steps.push({
      title: "Admin settings",
      subtitle: "Booking mode, platform fee, and verification.",
      valid: true,
      content: (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Booking mode</Label>
            <Select
              value={bookingMode}
              onValueChange={(value) =>
                value && setBookingMode(value as "manual_accept" | "auto_accept")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual_accept">Manual accept</SelectItem>
                <SelectItem value="auto_accept">Auto accept</SelectItem>
              </SelectContent>
            </Select>
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
          <label className="flex items-center gap-2 self-end text-sm">
            <Checkbox checked={isVerified} onCheckedChange={(v) => setIsVerified(v === true)} />
            Verified (admin only)
          </label>
        </div>
      ),
    });
  }

  steps.push({
    title: "Review & publish",
    subtitle: "Your listing goes live now. The verified badge waits for admin review.",
    valid: true,
    content: (
      <div className="space-y-4">
        <dl className="divide-y rounded-xl border text-sm">
          {[
            ["Name", name],
            ["Type", PROPERTY_TYPE_LABEL[propertyType] ?? "—"],
            ["Booking", categories.map((c) => CATEGORY_LABEL[c]).join(", ") || "—"],
            ...(isExperience
              ? [
                  [
                    "Experiences",
                    experienceTypes.map((e) => EXPERIENCE_LABEL[e] ?? e).join(", ") || "—",
                  ] as [string, string],
                ]
              : []),
            ["Location", [area, city, country].filter(Boolean).join(", ") || "—"],
            ["Amenities", amenities.length ? `${amenities.length} selected` : "None"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 p-3">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="max-w-[60%] truncate text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} />
          Active (visible to guests)
        </label>
      </div>
    ),
  });

  const lastStep = steps.length - 1;
  const current = steps[step];

  function next() {
    if (!current.valid) return;
    setStep((s) => Math.min(s + 1, lastStep));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step < lastStep) {
      next();
      return;
    }
    if (submitting) return;
    setSubmitting(true);

    const payload = {
      slug: listing?.slug ?? generateSlug(name) + "-" + Date.now().toString(36),
      title: name,
      name,
      description: description || null,
      country,
      city,
      area,
      property_type: propertyType || null,
      experience_types: isExperience ? experienceTypes : [],
      private_address: privateAddress,
      check_in_instructions: checkInInstructions || null,
      latitude,
      longitude,
      categories,
      category: categories,
      hourly_price: hourlyPrice ? parseFloat(hourlyPrice) : null,
      overnight_price: overnightPrice ? parseFloat(overnightPrice) : null,
      experience_price: experiencePrice ? parseFloat(experiencePrice) : null,
      deposit_amount: 0,
      currency,
      total_units: Math.max(1, parseInt(totalUnits || "1")),
      available_units: Math.max(1, parseInt(totalUnits || "1")),
      booking_mode: isAdmin ? bookingMode : listing?.booking_mode ?? "manual_accept",
      verification_status:
        isAdmin && isVerified ? "verified" : listing?.verification_status ?? "pending",
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
    };

    const imageList = imageUrls
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);

    const res = await fetch("/api/listings", {
      method: listing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId: listing?.id,
        payload,
        imageUrls: imageList,
      }),
    });

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Unknown error" }));
      alert(
        `Failed to ${listing ? "update" : "create"} listing: ${error ?? "Unknown error"}`
      );
      setSubmitting(false);
      return;
    }

    router.push("/dashboard/listings");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span className="uppercase tracking-wide text-[#800020]">
            {listing ? "Edit listing" : "New listing"}
          </span>
          <span>
            Step {step + 1} of {steps.length}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#f1e6ea]">
          <div
            className="h-full rounded-full bg-[#800020] transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold text-[#181113]">{current.title}</h2>
        {current.subtitle && (
          <p className="mt-2 text-sm text-muted-foreground">{current.subtitle}</p>
        )}
        <div className="mt-6">{current.content}</div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        {step > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={back}
            className="h-11 rounded-full px-5"
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
        )}
        {step < lastStep ? (
          <Button
            type="button"
            onClick={next}
            disabled={!current.valid}
            className="h-11 flex-1 rounded-full bg-[#800020] font-bold hover:bg-[#600018]"
          >
            Continue
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={submitting}
            className="h-11 flex-1 rounded-full bg-[#800020] font-bold hover:bg-[#600018]"
          >
            {submitting ? "Saving…" : listing ? "Update listing" : "Publish listing"}
          </Button>
        )}
      </div>
    </form>
  );
}

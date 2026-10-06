"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ElementType } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { uploadListingImage } from "@/lib/upload-image";
import { InstructionsManager } from "@/components/instructions-manager";
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
import {
  CalendarDays,
  Check,
  Clock,
  ImagePlus,
  Layers,
  Moon,
  Plus,
  Search,
  Trash2,
  ChevronLeft,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@iconify/react";
import { PROPERTY_TYPES, PROPERTY_TYPE_LABEL } from "@/lib/property-types";
import { AMENITY_LABEL } from "@/lib/amenities";
import { EXPERIENCE_GROUPS, EXPERIENCE_LABEL } from "@/lib/experience-types";
import { useCurrency } from "@/components/currency-provider";
import { convertAmount, formatMoney } from "@/lib/currency";
import type { Listing, ListingCategory } from "@/lib/types";

const CATEGORY_OPTIONS: {
  value: "hourly" | "overnight" | "both";
  label: string;
  badge?: string;
  description: string;
  icon: string;
  image: string;
}[] = [
  {
    value: "overnight",
    label: "Night stay",
    badge: "Recommended for homes",
    description: "Standard houses, apartments, villas, and suites booked per night.",
    icon: "solar:moon-stars-bold-duotone",
    image: "/images/cat-overnight.png",
  },
  {
    value: "hourly",
    label: "Hourly space",
    badge: "Conferences & Events only",
    description: "Conference rooms, meeting halls, event venues, photo studios, or workspaces.",
    icon: "solar:clock-circle-bold-duotone",
    image: "/images/cat-hourly.png",
  },
  {
    value: "both",
    label: "Both (Night stay + Events)",
    badge: "Dual-use spaces only",
    description: "Venues offering overnight accommodation and daytime event/meeting bookings.",
    icon: "solar:layers-minimalistic-bold-duotone",
    image: "/images/cat-all.png",
  },
];

const CATEGORY_LABEL: Record<ListingCategory, string> = {
  hourly: "Hourly stay",
  overnight: "Overnight stay",
  experience: "Experience",
};

const WEEK_DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

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
  // Pre-select a booking type when starting fresh (e.g. "Add experience").
  initialCategory?: ListingCategory;
}

export function ListingForm({ listing, hostId, isAdmin, initialCategory }: ListingFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [step, setStep] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);

  // Bring the top of the current step into view whenever the step changes —
  // long steps otherwise leave the user scrolled halfway down.
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

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
  const { rates } = useCurrency();
  function usdHint(amount: string) {
    const value = parseFloat(amount || "0");
    if (!value) return null;
    const usd = convertAmount(value, currency, "USD", rates);
    return usd == null ? null : `≈ ${formatMoney(usd, "USD")}`;
  }
  const [totalUnits, setTotalUnits] = useState(listing?.total_units?.toString() ?? "1");
  const [bookingMode, setBookingMode] = useState(listing?.booking_mode ?? "manual_accept");
  const [minimumHours, setMinimumHours] = useState(listing?.minimum_hours?.toString() ?? "1");
  const [checkInTime, setCheckInTime] = useState(listing?.check_in_time || "14:00");
  const [checkOutTime, setCheckOutTime] = useState(listing?.check_out_time || "11:00");
  const [availableDays, setAvailableDays] = useState<number[]>(
    listing?.available_days?.length ? listing.available_days : [0, 1, 2, 3, 4, 5, 6]
  );
  const [categories, setCategories] = useState<ListingCategory[]>(
    (listing?.categories as ListingCategory[]) ?? (initialCategory ? [initialCategory] : [])
  );
  const [hourlyConfirmOpen, setHourlyConfirmOpen] = useState(false);
  const [pendingHourlyChoice, setPendingHourlyChoice] = useState<"hourly" | "both" | null>(null);

  const selectedTypeInfo = useMemo(
    () => PROPERTY_TYPES.find((p) => p.value === propertyType),
    [propertyType]
  );
  const isResidentialProperty =
    selectedTypeInfo?.group === "Homes" || selectedTypeInfo?.group === "Rooms";

  function bookingChoice() {
    if (categories.includes("hourly") && categories.includes("overnight")) return "both";
    if (categories.includes("overnight")) return "overnight";
    if (categories.includes("hourly")) return "hourly";
    return "";
  }

  function handleSelectBookingChoice(choice: "hourly" | "overnight" | "both") {
    if (choice === "hourly" || choice === "both") {
      setPendingHourlyChoice(choice);
      setHourlyConfirmOpen(true);
      return;
    }
    setCategories(["overnight"]);
  }

  function confirmHourlyChoice() {
    if (pendingHourlyChoice) {
      setCategories(pendingHourlyChoice === "both" ? ["hourly", "overnight"] : [pendingHourlyChoice]);
    }
    setPendingHourlyChoice(null);
    setHourlyConfirmOpen(false);
  }

  function cancelHourlyChoice() {
    setCategories(["overnight"]);
    setPendingHourlyChoice(null);
    setHourlyConfirmOpen(false);
  }
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

  const imageList = imageUrls
    .split("\n")
    .map((u) => u.trim())
    .filter(Boolean);

  function removeImageAt(index: number) {
    setImageUrls(imageList.filter((_, i) => i !== index).join("\n"));
  }

  function makeCoverImage(index: number) {
    const selected = imageList[index];
    if (!selected) return;
    setImageUrls([selected, ...imageList.filter((_, i) => i !== index)].join("\n"));
  }

  function toggleExperienceType(value: string) {
    setExperienceTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  function toggleAvailableDay(day: number) {
    setAvailableDays((prev) =>
      prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day].sort()
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

  const popularPropertyTypes = PROPERTY_TYPES.filter((p) => {
    if (categories.includes("hourly") && !categories.includes("overnight")) {
      return [
        "conference_hall",
        "event_hall",
        "event_grounds",
        "meeting_room",
        "conference_room",
        "workspace",
        "studio_space",
        "private_room",
      ].includes(p.value);
    }
    return ["apartment", "house", "private_room", "studio", "villa", "hotel_room"].includes(p.value);
  });

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
    subtitle: "Choose the option that matches how you want to earn from this place.",
    valid: categories.length > 0,
    content: (
      <div className="space-y-4">
        <div className="grid gap-3.5 sm:grid-cols-3">
          {CATEGORY_OPTIONS.map(({ value, label, badge, description, icon, image }) => {
            const selected = bookingChoice() === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleSelectBookingChoice(value)}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border text-left transition-all ${
                  selected
                    ? "border-[#800020] bg-[#fbf0f3]/70 shadow-md ring-2 ring-[#800020]/25"
                    : "border-border bg-white hover:border-[#d7a9b7] hover:shadow-xs"
                }`}
                aria-pressed={selected}
              >
                <div>
                  <div className="relative h-28 w-full overflow-hidden bg-stone-100">
                    <Image
                      src={image}
                      alt={label}
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    {selected && (
                      <span className="absolute right-2.5 top-2.5 flex size-6 items-center justify-center rounded-full bg-[#800020] text-white shadow-sm ring-2 ring-white">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <span className="absolute bottom-2 left-2.5 flex items-center gap-1.5 text-white text-xs font-bold drop-shadow">
                      <Icon icon={icon} className="size-4 shrink-0" />
                      <span className="truncate">{label}</span>
                    </span>
                  </div>

                  <div className="p-3.5">
                    {badge && (
                      <div className="mb-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            value === "overnight"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : value === "hourly"
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-purple-50 text-purple-800 border border-purple-200"
                          }`}
                        >
                          {badge}
                        </span>
                      </div>
                    )}
                    <span className="block text-xs leading-5 text-stone-600 font-medium">
                      {description}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {isResidentialProperty && categories.includes("hourly") && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-amber-950 shadow-2xs">
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <Icon icon="solar:danger-triangle-bold" className="size-5" />
              </span>
              <div className="min-w-0 flex-1 space-y-1.5 text-xs">
                <p className="font-bold text-amber-950 text-sm">
                  Recommended: Use Night stay for residential homes
                </p>
                <p className="leading-relaxed text-amber-900">
                  You selected <strong className="font-semibold text-amber-950">{selectedTypeInfo?.label || "a residential space"}</strong>. Listing standard houses or apartments by the hour confuses travelers looking for overnight stays and hurts booking rates.
                </p>
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setCategories(["overnight"])}
                    className="h-8 rounded-full bg-[#800020] px-4 text-xs font-bold text-white hover:bg-merlot shadow-xs"
                  >
                    Switch to Night stay (Recommended)
                  </Button>
                  <span className="text-[11px] text-amber-800 font-medium">
                    Keep hourly only if strictly hosting meetings, workshops, or shoots.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="rounded-xl bg-[#fbf7f8] px-4 py-3 text-xs leading-5 text-muted-foreground">
          Tip: Normal residential houses and apartments should always use <strong>Night stay</strong>. Hourly booking is reserved for conference spaces, event grounds, meeting rooms, and creative studios.
        </p>
      </div>
    ),
  });

  steps.push({
    title: "What kind of place is it?",
    subtitle: "Choose the property type. Search if you don't see it right away.",
    valid: propertyType.length > 0,
    content: (
      <div className="space-y-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={propertySearch}
            onChange={(e) => setPropertySearch(e.target.value)}
            placeholder="Search type (villa, studio, hostel…)"
            className="pl-9"
          />
        </div>
        {!propertySearch.trim() && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Most common
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {popularPropertyTypes.map((p) => {
                const selected = propertyType === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPropertyType(p.value)}
                    aria-pressed={selected}
                    className={`flex min-h-16 items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm transition ${
                      selected
                        ? "border-crimson bg-[#fbf7f8] font-medium text-[#2b000a]"
                        : "border-border bg-white hover:border-[#d7a9b7]"
                    }`}
                  >
                    <AmenityIcon
                      icon={p.icon}
                      width={22}
                      height={22}
                      className={selected ? "text-crimson" : "text-muted-foreground"}
                    />
                    <span className="min-w-0 flex-1">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          All property types
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {filteredPropertyTypes.map((p) => {
            const selected = propertyType === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setPropertyType(p.value)}
                aria-pressed={selected}
                className={`flex min-h-14 items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                  selected
                    ? "border-crimson bg-[#fbf7f8] font-medium text-[#2b000a]"
                    : "border-border bg-white hover:border-[#d7a9b7]"
                }`}
              >
                <AmenityIcon
                  icon={p.icon}
                  width={22}
                  height={22}
                  className={selected ? "text-crimson" : "text-muted-foreground"}
                />
                <span className="min-w-0 flex-1">{p.label}</span>
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
            <p className="text-xs font-medium text-cranberry">
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
                              ? "border-crimson bg-[#fbf7f8] font-medium text-[#2b000a]"
                              : "border-border bg-white hover:border-[#d7a9b7]"
                          }`}
                        >
                          <AmenityIcon
                            icon={it.icon}
                            width={22}
                            height={22}
                            className={selected ? "text-crimson" : "text-muted-foreground"}
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
    subtitle: "Choose the public area guests will recognize. They will not see your exact address here.",
    valid: country.trim().length > 0 && city.trim().length > 0 && area.trim().length > 0,
    content: (
      <LocationPicker
        mode="area"
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
    ),
  });

  steps.push({
    title: "Place the map pin",
    subtitle: "Use GPS, a nearby landmark, or the map. Put the pin close to your gate or building.",
    valid: Number.isFinite(latitude) && Number.isFinite(longitude),
    content: (
      <LocationPicker
        mode="pin"
        latitude={latitude}
        longitude={longitude}
        initialCountryCode={undefined}
        onPlaceChange={(place) => {
          if (place.country) setCountry(place.country);
          if (place.region) setCity(place.region);
          if (place.village || place.district) setArea(place.village || place.district || "");
        }}
        onCoordsChange={(lat, lng) => {
          setLatitude(lat);
          setLongitude(lng);
        }}
      />
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
    title: "Units & arrival times",
    subtitle: "Specify how many spaces guests can book and your preferred check-in hours.",
    valid: !categories.includes("hourly") || parseInt(minimumHours || "0") >= 1,
    content: (
      <div className="space-y-5">
        {/* Total Units Counter */}
        <div className="rounded-2xl border border-[#f3cfd9] bg-white p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <Label className="text-sm font-bold text-[#181113] flex items-center gap-2">
                <Icon icon="solar:home-smile-bold-duotone" className="size-5 text-[#800020]" />
                Bookable units
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                How many independent listings or spaces can guests reserve?
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTotalUnits(String(Math.max(1, parseInt(totalUnits || "1") - 1)))}
                disabled={parseInt(totalUnits || "1") <= 1}
                className="size-10 rounded-full border border-stone-200 bg-stone-50 flex items-center justify-center text-lg font-bold text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                -
              </button>
              <span className="w-16 text-center text-base font-extrabold text-[#2b000a]">
                {totalUnits || "1"} {parseInt(totalUnits || "1") === 1 ? "unit" : "units"}
              </span>
              <button
                type="button"
                onClick={() => setTotalUnits(String(parseInt(totalUnits || "1") + 1))}
                className="size-10 rounded-full border border-stone-200 bg-stone-50 flex items-center justify-center text-lg font-bold text-stone-700 hover:bg-stone-100 transition"
              >
                +
              </button>
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-[#fbf7f8] px-3.5 py-2.5 text-[11px] text-stone-600 leading-relaxed">
            💡 <strong>Tip:</strong> Usually <strong>1</strong> for an entire house, apartment, villa, or single event space. Only increase if you have multiple identical rooms/units under this listing.
          </div>
        </div>

        {/* Hourly minimum hours if hourly space */}
        {categories.includes("hourly") && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="minimumHours" className="text-sm font-bold text-amber-950 flex items-center gap-2">
                <Icon icon="solar:clock-circle-bold" className="size-5 text-amber-700" />
                Minimum hours per booking
              </Label>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                Hourly spaces only
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { label: "1 hour", value: "1" },
                { label: "2 hours", value: "2" },
                { label: "4 hours", value: "4" },
                { label: "8 hours (Full day)", value: "8" },
              ].map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setMinimumHours(p.value)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    minimumHours === p.value
                      ? "bg-[#800020] text-white shadow-xs"
                      : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-amber-800">
              Guests will be required to book at least {minimumHours || "1"} hour{minimumHours === "1" ? "" : "s"}.
            </p>
          </div>
        )}

        {/* Check-in and Check-out Times */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#f3cfd9] bg-white p-4">
            <Label htmlFor="checkInTime" className="text-xs font-bold text-[#2b000a] flex items-center gap-1.5">
              <Icon icon="solar:login-2-bold-duotone" className="size-4 text-[#800020]" />
              Check-in time
            </Label>
            <div className="mt-2 flex flex-wrap gap-1.5 mb-2.5">
              {[
                { label: "12:00 PM", value: "12:00" },
                { label: "2:00 PM", value: "14:00" },
                { label: "3:00 PM", value: "15:00" },
              ].map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setCheckInTime(preset.value)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                    checkInTime === preset.value
                      ? "bg-[#800020] text-white"
                      : "border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <Input
              id="checkInTime"
              type="time"
              value={checkInTime || "14:00"}
              onChange={(e) => setCheckInTime(e.target.value)}
              className="h-10 text-xs font-medium"
            />
          </div>

          <div className="rounded-2xl border border-[#f3cfd9] bg-white p-4">
            <Label htmlFor="checkOutTime" className="text-xs font-bold text-[#2b000a] flex items-center gap-1.5">
              <Icon icon="solar:logout-2-bold-duotone" className="size-4 text-[#800020]" />
              Check-out time
            </Label>
            <div className="mt-2 flex flex-wrap gap-1.5 mb-2.5">
              {[
                { label: "10:00 AM", value: "10:00" },
                { label: "11:00 AM", value: "11:00" },
                { label: "12:00 PM", value: "12:00" },
              ].map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setCheckOutTime(preset.value)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                    checkOutTime === preset.value
                      ? "bg-[#800020] text-white"
                      : "border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <Input
              id="checkOutTime"
              type="time"
              value={checkOutTime || "11:00"}
              onChange={(e) => setCheckOutTime(e.target.value)}
              className="h-10 text-xs font-medium"
            />
          </div>
        </div>
      </div>
    ),
  });

  steps.push({
    title: "When is your place open?",
    subtitle: "Select your normal operating days. You can easily block dates later from your dashboard.",
    valid: availableDays.length > 0,
    content: (
      <div className="space-y-5">
        <div className="rounded-2xl border border-[#f3cfd9] bg-white p-5 shadow-xs">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Icon icon="solar:calendar-bold-duotone" className="size-5 text-[#800020]" />
                <p className="text-sm font-bold text-[#181113]">Usual open days</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Guests can book on these days. You can block holidays or dates anytime.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Every day", days: [0, 1, 2, 3, 4, 5, 6] },
                { label: "Weekdays", days: [1, 2, 3, 4, 5] },
                { label: "Weekends", days: [0, 6] },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setAvailableDays(preset.days)}
                  className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-[#2b000a] hover:border-[#d7a9b7] hover:bg-[#fbf7f8] transition"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {WEEK_DAYS.map((day) => {
              const selected = availableDays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleAvailableDay(day.value)}
                  aria-pressed={selected}
                  className={`h-12 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 ${
                    selected
                      ? "border-[#800020] bg-[#800020] text-white shadow-xs"
                      : "border-border bg-stone-50 text-stone-600 hover:border-[#d7a9b7]"
                  }`}
                >
                  <span>{day.label}</span>
                  <span className={`size-1.5 rounded-full ${selected ? "bg-white" : "bg-transparent"}`} />
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs font-semibold text-[#800020]">
            {availableDays.length} day{availableDays.length === 1 ? "" : "s"} open per week
          </p>
        </div>

        {/* Visual Calendar Tip Card with illustration */}
        <div className="rounded-2xl border border-stone-200/80 bg-gradient-to-r from-[#fbf0f3]/50 to-white p-4 flex items-center gap-4">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-[#f3cfd9] bg-white">
            <Image
              src="/images/empty-calendar.png"
              alt="Calendar integration"
              fill
              className="object-cover"
            />
          </div>
          <div className="min-w-0 flex-1 text-xs">
            <p className="font-bold text-[#2b000a] text-sm flex items-center gap-1.5">
              <Icon icon="solar:shield-check-bold" className="size-4 text-emerald-600" />
              Easy calendar management
            </p>
            <p className="mt-0.5 text-stone-600 leading-relaxed text-[11px]">
              No complicated date scheduling needed right now. Once your listing goes live, you can import your Airbnb/Google Calendar iCal link or block off dates directly.
            </p>
          </div>
        </div>
      </div>
    ),
  });

  steps.push({
    title: "Pricing",
    subtitle: "Set the rates for the booking types you chose.",
    valid:
      (!categories.includes("hourly") || parseFloat(hourlyPrice || "0") > 0) &&
      (!categories.includes("overnight") || parseFloat(overnightPrice || "0") > 0) &&
      (!categories.includes("experience") || parseFloat(experiencePrice || "0") > 0),
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
          <p className="mt-1 text-xs text-muted-foreground">
            You get paid in {currency}. Guests who switch their display currency see an
            estimate — Beddn sets that rate.
          </p>
        </div>
        {categories.includes("overnight") && (
          <div>
            <Label htmlFor="overnightPrice" className="font-bold">
              Night stay price (Standard)
            </Label>
            <Input
              id="overnightPrice"
              type="number"
              step="0.01"
              value={overnightPrice}
              onChange={(e) => setOvernightPrice(e.target.value)}
              placeholder="e.g. 5000"
            />
            {usdHint(overnightPrice) && (
              <p className="mt-1 text-xs text-muted-foreground">{usdHint(overnightPrice)}</p>
            )}
            <p className="mt-1 text-[11px] text-muted-foreground">
              Rate charged per night for overnight guests.
            </p>
          </div>
        )}
        {categories.includes("hourly") && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 sm:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <Label htmlFor="hourlyPrice" className="text-amber-950 font-bold flex items-center gap-1.5">
                <Icon icon="solar:clock-circle-bold" className="size-4 text-amber-700" />
                Hourly price (Conferences & Events only)
              </Label>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-200">
                Spaces & Events
              </span>
            </div>
            <Input
              id="hourlyPrice"
              type="number"
              step="0.01"
              value={hourlyPrice}
              onChange={(e) => setHourlyPrice(e.target.value)}
              className="bg-white"
              placeholder="e.g. 2500"
            />
            {usdHint(hourlyPrice) && (
              <p className="mt-1 text-xs text-muted-foreground">{usdHint(hourlyPrice)}</p>
            )}
            <p className="mt-1.5 text-[11px] text-amber-800">
              Only charge hourly if this space is rented for conferences, meetings, event halls, photo shoots, or creative workshops.
            </p>
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
            {usdHint(experiencePrice) && (
              <p className="mt-1 text-xs text-muted-foreground">{usdHint(experiencePrice)}</p>
            )}
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
    title: "Add photos (Required)",
    subtitle: "At least one clear photo is required before publishing your listing.",
    valid: imageList.length > 0,
    content: (
      <div className="space-y-4">
        <Label
          htmlFor="image-files"
          className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#d7a9b7] bg-[#fbf7f8] px-4 py-8 text-center hover:bg-[#f8eef2]"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-white text-crimson shadow-sm">
            <ImagePlus className="h-6 w-6" />
          </span>
          <span className="mt-3 text-sm font-bold text-[#181113]">
            {uploading ? "Uploading photos..." : "Upload photos"}
          </span>
          <span className="mt-1 text-xs font-normal text-muted-foreground">
            Add room, exterior, bathroom, view, and entrance photos. The first photo is the cover.
          </span>
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
            className="sr-only"
          />
        </Label>
        <p className="rounded-lg bg-[#fbf7f8] px-3 py-2 text-xs text-cranberry">
          Do not add phone numbers or payment details to listing photos. Guests should use Check
          Availability so your inquiries are organized and tracked.
        </p>
        {uploading && <p className="text-xs font-medium text-crimson">Uploading…</p>}
        {uploadError && <p className="text-xs font-medium text-red-600">{uploadError}</p>}

        {imageList.length > 0 ? (
          <div className="space-y-3 pt-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageList[0]} alt="Cover photo" className="h-full w-full object-cover" />
              <span className="absolute left-3 top-3 rounded-full bg-crimson px-3 py-1 text-xs font-bold text-white">
                Main photo
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {imageList.map((url, i) => (
              <div
                key={`${url}-${i}`}
                className={`group relative aspect-square overflow-hidden rounded-lg border bg-muted ${
                  i === 0 ? "ring-2 ring-crimson ring-offset-2" : ""
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImageAt(i)}
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {i === 0 ? (
                  <span className="absolute bottom-1 left-1 rounded bg-crimson px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Cover
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => makeCoverImage(i)}
                    className="absolute bottom-1 left-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-[#2b000a] opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                  >
                    Make main
                  </button>
                )}
              </div>
            ))}
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed px-4 py-5 text-center text-xs text-muted-foreground">
            No photos yet. Add at least one clear image so guests can trust the listing.
          </p>
        )}
      </div>
    ),
  });

  // Instructions live on the listing row, so they can only be managed once the
  // listing exists (edit flow). New listings get this step after first save.
  if (listing?.id) {
    steps.push({
      title: "Stay instructions",
      subtitle: "Add check-in info, house rules, group links, and experience details with visibility controls.",
      valid: true,
      content: <InstructionsManager listingId={listing.id} />,
    });
  }

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
    title: "Review & go live",
    subtitle: "Check the details, then choose to publish now or save and finish later.",
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
        <div className="rounded-xl bg-[#fbf7f8] p-4 text-sm text-[#2b000a]">
          <p className="font-semibold">How requests and leads work</p>
          <p className="mt-1 text-muted-foreground">
            Guests check availability on Beddn, then send an inquiry. If your host phone is
            saved, they can continue directly to WhatsApp. Payments and final agreement happen
            outside Beddn for now, so keep your calendar updated after each conversation.
          </p>
        </div>
        <div className="flex items-center gap-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-950">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-white p-1">
            <Image
              src="/images/spot-verified.png"
              alt="Ready to publish"
              fill
              className="object-contain"
            />
          </div>
          <div className="min-w-0 text-xs">
            <p className="font-bold text-emerald-950 text-sm">Ready to go live!</p>
            <p className="text-emerald-800 leading-relaxed text-[11px]">
              Tap <strong>Go live</strong> below to publish your place to guests across Beddn. Prices and photos are verified.
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-dashed border-[#d7a9b7] p-4 text-sm">
          <p className="font-semibold text-[#2b000a]">Flexible schedule</p>
          <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
            Your open days will be saved with this listing. You can block dates or sync iCal anytime from <strong>Dashboard → Calendar</strong>.
          </p>
        </div>
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
    }
  }

  async function submitListing(asDraft: boolean) {
    if (asDraft && name.trim().length < 2) {
      alert("Oops, add a listing name before saving a draft.");
      return;
    }
    if (!asDraft) {
      const goToStep = (title: string) => {
        const index = steps.findIndex((item) => item.title === title);
        if (index >= 0) setStep(index);
      };
      if (categories.length === 0) {
        goToStep("How can guests book it?");
        alert("Oops, choose how guests can book this listing.");
        return;
      }
      if (!propertyType) {
        goToStep("What kind of place is it?");
        alert("Oops, choose what kind of place this is.");
        return;
      }
      if (!country.trim() || !city.trim() || !area.trim()) {
        goToStep("Where is it?");
        alert("Oops, add the public area guests will see.");
        return;
      }
      if (!privateAddress.trim()) {
        goToStep("Exact address & arrival");
        alert("Oops, add the private address. Guests only see it after a confirmed booking.");
        return;
      }
      if (categories.includes("hourly") && parseFloat(hourlyPrice || "0") <= 0) {
        goToStep("Pricing");
        alert("Oops, add an hourly price before publishing.");
        return;
      }
      if (categories.includes("overnight") && parseFloat(overnightPrice || "0") <= 0) {
        goToStep("Pricing");
        alert("Oops, add a night price before publishing.");
        return;
      }
      if (categories.includes("experience") && parseFloat(experiencePrice || "0") <= 0) {
        goToStep("Pricing");
        alert("Oops, add an experience price before publishing.");
        return;
      }
      if (imageList.length === 0) {
        goToStep("Add photos (Required)");
        alert("Photos are strictly required before publishing. Please upload at least one photo of your place.");
        return;
      }
    }
    if (submitting || savingDraft) return;
    if (asDraft) setSavingDraft(true);
    else setSubmitting(true);

    // Publish (non-draft) always goes live and visible; draft stays private.
    const active = !asDraft;
    const payload = {
      slug: listing?.slug ?? generateSlug(name || "draft") + "-" + Date.now().toString(36),
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
      available_days: availableDays,
      booking_mode: isAdmin ? bookingMode : listing?.booking_mode ?? "manual_accept",
      verification_status:
        isAdmin && isVerified ? "verified" : listing?.verification_status ?? "pending",
      listing_status: asDraft ? "draft" : active ? "active" : "paused",
      platform_fee_type: platformFeeType,
      platform_fee_value: parseFloat(platformFeeValue || "0"),
      minimum_hours: Math.max(1, parseInt(minimumHours || "1")),
      check_in_time: checkInTime || null,
      check_out_time: checkOutTime || null,
      amenities,
      house_rules: houseRules || null,
      is_active: active,
      is_verified: isAdmin ? isVerified : listing?.is_verified ?? false,
    };

    const availabilitySlots: any[] = [];

    const res = await fetch("/api/listings", {
      method: listing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId: listing?.id,
        payload,
        imageUrls: imageList,
        availabilitySlots,
      }),
    });

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Unknown error" }));
      alert(
        `Failed to ${listing ? "update" : "create"} listing: ${error ?? "Unknown error"}`
      );
      setSubmitting(false);
      setSavingDraft(false);
      return;
    }

    router.push("/host/listings");
    router.refresh();
  }

  const percent = Math.round(((step + 1) / steps.length) * 100);

  return (
    <>
      <form onSubmit={handleSubmit} className="mx-auto flex max-w-xl flex-col pb-28 pt-4 sm:pb-0 sm:pt-6">
        <div ref={topRef} className="scroll-mt-20" />

      {/* High-end Stepper Progress Header */}
      <div className="mb-6 rounded-3xl border border-[#f3cfd9]/80 bg-gradient-to-br from-white via-white to-[#fdf7f9] p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#fbf0f3] text-[#800020] border border-[#f3cfd9]">
              <Icon icon="solar:home-add-bold-duotone" className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-bold text-[#800020] uppercase tracking-wider">
                {listing ? "Update Listing" : "Host Setup"}
              </p>
              <h3 className="text-sm font-bold text-[#2b000a] truncate max-w-[200px] sm:max-w-xs">
                {current.title}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-[#fbf0f3] px-3 py-1 text-xs font-bold text-[#800020] border border-[#f3cfd9]">
              {percent}% complete
            </span>
          </div>
        </div>

        {/* Animated Smooth Progress Track */}
        <div className="mt-4 relative h-2.5 w-full overflow-hidden rounded-full bg-[#f3e9ed]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#800020] via-[#a6173e] to-[#d6285a] transition-all duration-500 ease-out shadow-xs"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Interactive Step Navigator */}
        <div className="mt-3 flex items-center justify-between gap-1 text-[11px] font-medium text-stone-500">
          <span>Step {step + 1} of {steps.length}</span>
          <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-[65%] [scrollbar-width:none]">
            {steps.map((s, i) => {
              const isPast = i < step;
              const isCurrent = i === step;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={i > step}
                  onClick={() => i < step && setStep(i)}
                  title={s.title}
                  className={`size-6 shrink-0 rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${
                    isCurrent
                      ? "bg-[#800020] text-white ring-2 ring-[#800020]/20 scale-110"
                      : isPast
                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 cursor-pointer"
                      : "bg-[#f5ecf0] text-stone-400 cursor-not-allowed"
                  }`}
                >
                  {isPast ? <Check className="size-3" /> : i + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Centered focus area */}
      <div className="flex flex-1 items-start py-1">
        <div className="relative w-full overflow-hidden rounded-3xl border border-[#f3cfd9] bg-white p-5 shadow-lg shadow-[#800020]/5 sm:p-8">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 size-48 rounded-full bg-radial from-[#fbf0f3] to-transparent pointer-events-none opacity-80 blur-xl" />
          
          <div className="relative z-10 mb-6">
            <h2 className="font-brand text-2xl font-extrabold text-[#2b000a] sm:text-3xl tracking-tight">
              {current.title}
            </h2>
            {current.subtitle && (
              <p className="mt-1.5 text-sm leading-relaxed text-stone-600 font-medium">
                {current.subtitle}
              </p>
            )}
          </div>
          <div className="relative z-10 sm:max-h-[62vh] sm:overflow-y-auto sm:pr-2">
            {current.content}
          </div>
        </div>
      </div>

      {/* Action bar — sticky to the bottom of the viewport on mobile so the
          primary action is always reachable on long steps. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
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
              className="h-11 flex-1 rounded-full bg-[#800020] font-bold hover:bg-[#6b1029]"
            >
              {current.valid ? "Continue" : "Oops, add this first"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => submitListing(false)}
              disabled={submitting || savingDraft}
              className="h-11 flex-1 rounded-full bg-[#800020] font-bold hover:bg-[#6b1029]"
            >
              {submitting ? "Going live…" : listing ? "Save & go live" : "Go live"}
            </Button>
          )}
          {/* Save progress and finish later — skips the publish validation. */}
          <Button
            type="button"
            variant="outline"
            onClick={() => submitListing(true)}
            disabled={savingDraft || submitting || name.trim().length < 2}
            className="h-11 shrink-0 rounded-full px-4"
          >
            {savingDraft ? "Saving…" : "Save draft"}
          </Button>
        </div>
      </div>
    </form>

    <Dialog
      open={hourlyConfirmOpen}
      onOpenChange={(open) => {
        if (!open) cancelHourlyChoice();
      }}
    >
      <DialogContent className="sm:max-w-md p-6 rounded-3xl border border-[#f3cfd9] bg-white text-stone-900 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-[#fbf0f3] text-[#800020] mb-4 border border-[#f3cfd9]">
            <Icon icon="solar:buildings-3-bold-duotone" className="size-8 text-[#800020]" />
          </div>
          <DialogTitle className="text-xl font-bold font-brand text-[#2b000a]">
            Are you sure you want an hourly listing?
          </DialogTitle>
          <DialogDescription className="mt-2 text-xs leading-relaxed text-stone-600 max-w-sm">
            Hourly booking on Beddn is designed specifically for <strong>conferences, meeting rooms, event halls, photo studios, and workspaces</strong>.
            <br /><br />
            Normal houses, villas, and apartments listed by the hour confuse guests browsing for overnight stays and can harm booking rates.
          </DialogDescription>
        </div>

        <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-3.5 text-xs text-stone-700">
          <p className="font-semibold text-stone-900 flex items-center gap-1.5 mb-1">
            <Icon icon="solar:info-circle-bold" className="size-4 text-[#800020]" />
            Is this a conference hall or event venue?
          </p>
          <p className="text-[11px] text-stone-500 leading-normal">
            If this is a normal residential house or apartment, choose <strong>Night stay</strong> so guests see standard nightly prices.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Button
            type="button"
            onClick={cancelHourlyChoice}
            className="w-full h-11 rounded-full bg-[#800020] text-white hover:bg-[#600018] font-bold text-sm shadow-sm"
          >
            Use Night stay (Recommended for homes)
          </Button>
          <button
            type="button"
            onClick={confirmHourlyChoice}
            className="w-full h-10 rounded-full border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-xs transition-colors"
          >
            Yes, this is an Event or Conference space
          </button>
        </div>
      </DialogContent>
    </Dialog>
  </>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadListingImage } from "@/lib/upload-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationPicker } from "@/components/location-picker";
import { AmenityIcon } from "@/components/amenity-icon";
import {
  Clock,
  Compass,
  MapPin,
  Users,
  Image as ImageIcon,
  DollarSign,
  Plus,
  Trash2,
  ChevronLeft,
  Search,
} from "lucide-react";
import { EXPERIENCE_GROUPS } from "@/lib/experience-types";
import { useCurrency } from "@/components/currency-provider";
import { convertAmount, formatMoney } from "@/lib/currency";
import type { Listing } from "@/lib/types";

const TIME_SLOTS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", 
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", 
  "20:00", "21:00", "22:00", "23:00"
];

const WEEK_DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

type DateSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  availableUnits: string;
};

interface ExperienceFormProps {
  listing?: Listing;
  hostId?: string;
  isAdmin?: boolean;
}

export function ExperienceForm({ listing, hostId, isAdmin }: ExperienceFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [step, setStep] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  // Form Fields State
  const [name, setName] = useState(listing?.name ?? "");
  const [experienceTypes, setExperienceTypes] = useState<string[]>(
    listing?.experience_types ?? []
  );
  const [experienceSearch, setExperienceSearch] = useState("");
  const [durationValue, setDurationValue] = useState(() => {
    const val = (listing as any)?.experience_duration || "3";
    const match = val.match(/^(\d+)/);
    return match ? match[1] : "3";
  });
  const [durationUnit, setDurationUnit] = useState(() => {
    const val = (listing as any)?.experience_duration || "hours";
    const match = val.match(/[a-zA-Z]+/);
    return match ? match[0].toLowerCase() : "hours";
  });
  const [experienceGroupSize, setExperienceGroupSize] = useState(
    (listing as any)?.experience_group_size?.toString() ?? "10"
  );
  const [experienceRequirements, setExperienceRequirements] = useState(
    (listing as any)?.experience_requirements ?? ""
  );
  const [country, setCountry] = useState(listing?.country ?? "");
  const [city, setCity] = useState(listing?.city ?? "");
  const [area, setArea] = useState(listing?.area ?? "");
  const [experienceMeetingPoint, setExperienceMeetingPoint] = useState(
    (listing as any)?.experience_meeting_point ?? ""
  );
  const [latitude, setLatitude] = useState(listing?.latitude ?? -1.29);
  const [longitude, setLongitude] = useState(listing?.longitude ?? 36.82);
  const [currency, setCurrency] = useState(listing?.currency ?? "KES");
  const [experiencePrice, setExperiencePrice] = useState(
    listing?.experience_price?.toString() ?? ""
  );
  const [description, setDescription] = useState(listing?.description ?? "");
  const [houseRules, setHouseRules] = useState(listing?.house_rules ?? "");
  const [availableDays, setAvailableDays] = useState<number[]>(
    listing?.available_days?.length ? listing.available_days : [0, 1, 2, 3, 4, 5, 6]
  );
  const [dateSlots, setDateSlots] = useState<DateSlot[]>([]);
  const [isVerified, setIsVerified] = useState(listing?.is_verified ?? false);
  const [imageUrls, setImageUrls] = useState(
    listing?.listing_images?.map((img) => img.url).join("\n") ?? ""
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const { rates } = useCurrency();
  function usdHint(amount: string) {
    const value = parseFloat(amount || "0");
    if (!value) return null;
    const usd = convertAmount(value, currency, "USD", rates);
    return usd == null ? null : `≈ ${formatMoney(usd, "USD")}`;
  }

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

  function addDateSlot() {
    setDateSlots((prev) => [
      ...prev,
      {
        id: `slot-${Date.now()}-${prev.length}`,
        date: "",
        startTime: "10:00",
        endTime: "12:00",
        availableUnits: experienceGroupSize || "10",
      },
    ]);
  }

  function updateDateSlot(id: string, patch: Partial<DateSlot>) {
    setDateSlots((prev) =>
      prev.map((slot) => (slot.id === id ? { ...slot, ...patch } : slot))
    );
  }

  function removeDateSlot(id: string) {
    setDateSlots((prev) => prev.filter((slot) => slot.id !== id));
  }

  function generateSlug(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  async function submitListing(asDraft: boolean) {
    if (asDraft && name.trim().length < 2) {
      alert("Oops, add an experience name before saving a draft.");
      return;
    }
    if (submitting || savingDraft) return;
    if (asDraft) setSavingDraft(true);
    else setSubmitting(true);

    const active = !asDraft;
    const payload = {
      slug: listing?.slug ?? generateSlug(name || "draft") + "-" + Date.now().toString(36),
      title: name,
      name,
      description: description || null,
      country,
      city,
      area,
      experience_types: experienceTypes,
      private_address: experienceMeetingPoint, // use meeting point as private address
      latitude,
      longitude,
      categories: ["experience"],
      category: ["experience"],
      experience_price: experiencePrice ? parseFloat(experiencePrice) : null,
      deposit_amount: 0,
      currency,
      total_units: Math.max(1, parseInt(experienceGroupSize || "10")),
      available_units: Math.max(1, parseInt(experienceGroupSize || "10")),
      available_days: availableDays,
      listing_status: asDraft ? "draft" : active ? "active" : "paused",
      is_active: active,
      is_verified: isAdmin ? isVerified : listing?.is_verified ?? false,
      // Custom Experience fields
      experience_duration: `${durationValue} ${durationUnit}`,
      experience_meeting_point: experienceMeetingPoint,
      experience_group_size: Math.max(1, parseInt(experienceGroupSize || "10")),
      experience_requirements: experienceRequirements || null,
      house_rules: houseRules || null,
    };

    const availabilitySlots = dateSlots
      .filter((slot) => slot.date && slot.startTime && slot.endTime)
      .map((slot) => ({
        startDatetime: `${slot.date}T${slot.startTime}:00`,
        endDatetime: `${slot.date}T${slot.endTime}:00`,
        totalUnits: Math.max(1, parseInt(experienceGroupSize || "10")),
        availableUnits: Math.max(0, parseInt(slot.availableUnits || experienceGroupSize || "10")),
      }));

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
        `Oops, we could not ${listing ? "update" : "create"} this experience: ${error ?? "Unknown error"}`
      );
      setSubmitting(false);
      setSavingDraft(false);
      return;
    }

    router.push("/host/listings");
    router.refresh();
  }

  // Define Experience Steps
  const steps: { title: string; subtitle?: string; valid: boolean; content: React.ReactNode }[] = [];

  // Step 1: Name
  steps.push({
    title: "What is the name of your experience?",
    subtitle: "A short, descriptive name guests will see first. E.g., 'Sunset Kayaking & Wine Tasting'",
    valid: name.trim().length > 1,
    content: (
      <div>
        <Label htmlFor="name">Experience Title</Label>
        <Input
          id="name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Guided Nairobi Street Food Crawl"
          className="mt-2 h-12 text-base border-cream focus:border-crimson"
        />
      </div>
    ),
  });

  // Step 2: Experience Types
  const q = experienceSearch.trim().toLowerCase();
  steps.push({
    title: "What activities do you offer?",
    subtitle: "Pick everything that fits so guests can search and find your activity.",
    valid: experienceTypes.length > 0,
    content: (
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={experienceSearch}
            onChange={(e) => setExperienceSearch(e.target.value)}
            placeholder="Search activities (e.g. food, safari, photography)"
            className="pl-9 border-cream focus:border-crimson"
          />
        </div>
        <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1">
          {EXPERIENCE_GROUPS.map((group) => {
            const items = group.items.filter(
              (it) =>
                !q ||
                it.label.toLowerCase().includes(q) ||
                it.value.includes(q)
            );
            if (items.length === 0) return null;
            return (
              <div key={group.group} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                          selected
                            ? "border-[#800020] bg-cream font-medium text-[#2b000a]"
                            : "border-cream bg-white hover:border-crimson"
                        }`}
                      >
                        <AmenityIcon
                          icon={it.icon}
                          width={20}
                          height={20}
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

  // Step 3: Duration
  steps.push({
    title: "How long is the experience?",
    subtitle: "Select the timeframe for your experience.",
    valid: true,
    content: (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Duration Value</Label>
          <Select value={durationValue} onValueChange={(val) => setDurationValue(val || "3")}>
            <SelectTrigger className="border-cream mt-2 h-12 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 18, 24].map((num) => (
                <SelectItem key={num} value={String(num)}>
                  {num}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Duration Unit</Label>
          <Select value={durationUnit} onValueChange={(val) => setDurationUnit(val || "hours")}>
            <SelectTrigger className="border-cream mt-2 h-12 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hours">Hours</SelectItem>
              <SelectItem value="days">Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    ),
  });

  // Step 4: Group Size & Requirements
  steps.push({
    title: "Who can attend and in what size?",
    subtitle: "Specify capacity limits and requirements for safety and comfort.",
    valid: parseInt(experienceGroupSize) > 0,
    content: (
      <div className="space-y-5">
        <div>
          <Label htmlFor="groupSize">Maximum group size (seats / tickets)</Label>
          <Input
            id="groupSize"
            type="number"
            min="1"
            value={experienceGroupSize}
            onChange={(e) => setExperienceGroupSize(e.target.value)}
            className="mt-2 h-12 text-base border-cream focus:border-crimson"
          />
        </div>
        <div>
          <Label htmlFor="requirements">Guest requirements / fitness level</Label>
          <Textarea
            id="requirements"
            value={experienceRequirements}
            onChange={(e) => setExperienceRequirements(e.target.value)}
            rows={4}
            placeholder="e.g. Minimum age 18+. Moderate walking is required. Bring rain jackets."
            className="mt-2 border-cream focus:border-crimson"
          />
        </div>
      </div>
    ),
  });

  // Step 5: Location & Meeting Point
  steps.push({
    title: "Where is the meeting point?",
    subtitle: "Provide a map coordinate and detailed instructions on where you will meet.",
    valid: country.trim().length > 0 && city.trim().length > 0 && experienceMeetingPoint.trim().length > 0,
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Country</Label>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} className="border-cream" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">City</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} className="border-cream" />
          </div>
        </div>
        <div>
          <Label htmlFor="meetingPoint">Meeting Point Description (Shared publicly)</Label>
          <Textarea
            id="meetingPoint"
            value={experienceMeetingPoint}
            onChange={(e) => setExperienceMeetingPoint(e.target.value)}
            rows={3}
            placeholder="e.g. Meet in front of the main entrance fountain next to the security desk."
            className="border-cream focus:border-crimson"
          />
        </div>
      </div>
    ),
  });

  // Step 6: Images
  steps.push({
    title: "Add some stunning photos",
    subtitle: "Experiences are highly visual. Upload photos showing you or guests doing the activities.",
    valid: imageList.length >= 1,
    content: (
      <div className="space-y-4">
        <div className="rounded-2xl border-2 border-dashed border-cream bg-cream/20 p-8 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-cream text-crimson">
            <Compass className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-semibold text-[#2b000a]">Upload photos from your device</p>
          <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, JPEG up to 10MB each</p>
          <input
            type="file"
            multiple
            accept="image/*"
            disabled={uploading}
            onChange={(e) => handleImageFiles(e.target.files)}
            className="hidden"
            id="experience-photo-upload"
          />
          <Button
            type="button"
            disabled={uploading}
            onClick={() => document.getElementById("experience-photo-upload")?.click()}
            className="mt-4 rounded-full bg-cranberry hover:bg-merlot"
          >
            {uploading ? "Uploading..." : "Select Files"}
          </Button>
          {uploadError && <p className="mt-2 text-sm font-semibold text-red-600">{uploadError}</p>}
        </div>

        {imageList.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {imageList.map((url, i) => (
              <div key={url} className="group relative aspect-video overflow-hidden rounded-xl border border-cream">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImageAt(i)}
                  className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-600 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
  });

  // Step 7: Pricing
  steps.push({
    title: "How much do you charge per guest?",
    subtitle: "Set a ticket rate. Keep pricing transparent.",
    valid: parseFloat(experiencePrice) > 0,
    content: (
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Currency</Label>
          <Select value={currency} onValueChange={(value) => value && setCurrency(value)}>
            <SelectTrigger className="border-cream">
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
        <div>
          <Label htmlFor="price">Price per ticket / guest</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">
              {currency}
            </span>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={experiencePrice}
              onChange={(e) => setExperiencePrice(e.target.value)}
              className="pl-14 h-12 text-base border-cream focus:border-crimson"
            />
          </div>
          {usdHint(experiencePrice) && (
            <p className="mt-1 text-xs text-muted-foreground font-medium text-cranberry">
              {usdHint(experiencePrice)}
            </p>
          )}
        </div>
      </div>
    ),
  });

  // Step 8: Description
  steps.push({
    title: "Tell guests what you'll do",
    subtitle: "Provide a warm and detailed description of the flow of the activity.",
    valid: description.trim().length > 10,
    content: (
      <div className="space-y-4">
        <Label htmlFor="desc">What we will do</Label>
        <Textarea
          id="desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={7}
          placeholder="E.g. We will start the experience by gathering at the meeting point. From there, we will take a guided walking tour..."
          className="border-cream focus:border-crimson"
        />
        <p className="text-xs text-muted-foreground leading-normal">
          Keep it friendly, write about unique perspectives or access they'll get.
        </p>
      </div>
    ),
  });

  // Step 9: Rules & What to bring
  steps.push({
    title: "Details on what to bring & regulations",
    subtitle: "Specify gear requirements or guidelines.",
    valid: true,
    content: (
      <div className="space-y-4">
        <div>
          <Label htmlFor="houseRules">What to bring / special guidelines</Label>
          <Textarea
            id="houseRules"
            value={houseRules}
            onChange={(e) => setHouseRules(e.target.value)}
            rows={5}
            placeholder="e.g. Please bring sunscreen, a water bottle, and a camera. No pets are allowed on this trail."
            className="border-cream focus:border-crimson"
          />
        </div>
      </div>
    ),
  });

  // Step 10: Schedule and availability
  steps.push({
    title: "Schedule sessions",
    subtitle: "Define when you normally run this experience, or add exact dates for special group sessions.",
    valid: availableDays.length > 0,
    content: (
      <div className="space-y-5">
        <div>
          <Label className="text-sm font-bold text-[#2b000a] block mb-2">Usual days of operation</Label>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEK_DAYS.map((day) => {
              const selected = availableDays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleAvailableDay(day.value)}
                  className={`h-10 rounded-xl border text-xs font-bold transition ${
                    selected
                      ? "border-[#800020] bg-[#800020] text-white"
                      : "border-cream bg-white text-merlot hover:border-crimson"
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border bg-cream/30 p-4 border-cream">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-[#2b000a]">Date-specific sessions</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Define exact session times for specific tour dates.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={addDateSlot}
              className="h-10 rounded-full bg-white border-cream text-crimson"
            >
              <Plus className="mr-1 h-4 w-4" /> Add Date
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {dateSlots.length === 0 ? (
              <p className="rounded-xl border border-dashed bg-white px-4 py-5 text-center text-xs text-muted-foreground border-cream">
                No date-specific sessions scheduled. Standard weekly schedule applies.
              </p>
            ) : (
              dateSlots.map((slot) => (
                <div key={slot.id} className="grid gap-3 rounded-xl bg-white p-3 sm:grid-cols-[1.2fr_1fr_1fr_0.9fr_auto] sm:items-end border border-cream">
                  <div>
                    <Label className="text-xs">Date</Label>
                    <Input
                      type="date"
                      value={slot.date}
                      onChange={(event) => updateDateSlot(slot.id, { date: event.target.value })}
                      className="border-cream"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Start Time</Label>
                    <Select
                      value={slot.startTime}
                      onValueChange={(val) => updateDateSlot(slot.id, { startTime: val || "10:00" })}
                    >
                      <SelectTrigger className="border-cream h-10 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">End Time</Label>
                    <Select
                      value={slot.endTime}
                      onValueChange={(val) => updateDateSlot(slot.id, { endTime: val || "12:00" })}
                    >
                      <SelectTrigger className="border-cream h-10 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Seats / Capacity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={slot.availableUnits}
                      onChange={(event) =>
                        updateDateSlot(slot.id, { availableUnits: event.target.value })
                      }
                      className="border-cream"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removeDateSlot(slot.id)}
                    className="h-10 rounded-full px-3 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
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

  const percent = Math.round(((step + 1) / steps.length) * 100);

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-xl flex-col pb-28 pt-4 sm:pb-0 sm:pt-6">
      <div ref={topRef} className="scroll-mt-20" />

      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="uppercase tracking-wide text-cranberry flex items-center gap-1">
            <Compass className="h-3.5 w-3.5" />
            {listing ? "Edit Experience" : "New Experience Listing"}
          </span>
          <span className="text-muted-foreground">
            Step {step + 1} of {steps.length} · {percent}%
          </span>
        </div>
        <div className="mt-2 flex gap-1">
          {steps.map((s, i) => {
            const done = i < step;
            const isCurrent = i === step;
            return (
              <button
                key={i}
                type="button"
                aria-label={`Go to step ${i + 1}`}
                disabled={i > step}
                onClick={() => i < step && setStep(i)}
                className={`h-1.5 flex-1 overflow-hidden rounded-full transition-colors ${
                  done || isCurrent ? "bg-[#800020]" : "bg-cream"
                } ${i < step ? "cursor-pointer" : "cursor-default"}`}
              />
            );
          })}
        </div>
      </div>

      {/* Main step container */}
      <div className="py-3">
        <div className="w-full rounded-2xl border bg-white p-5 shadow-sm sm:p-6 border-cream">
          <h2 className="text-xl font-bold text-[#2b000a] flex items-center gap-2 sm:text-2xl">
            {step === 0 && <Compass className="h-6 w-6 text-crimson" />}
            {step === 2 && <Clock className="h-6 w-6 text-crimson" />}
            {step === 3 && <Users className="h-6 w-6 text-crimson" />}
            {step === 4 && <MapPin className="h-6 w-6 text-crimson" />}
            {step === 6 && <DollarSign className="h-6 w-6 text-crimson" />}
            {current.title}
          </h2>
          {current.subtitle && (
            <p className="mt-2 text-sm text-muted-foreground leading-normal">{current.subtitle}</p>
          )}
          <div className="mt-5 sm:max-h-[62vh] sm:overflow-y-auto sm:pr-1">{current.content}</div>
        </div>
      </div>

      {/* Navigation bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={back}
              className="h-11 rounded-full px-5 border-cream text-merlot hover:bg-cream/30"
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          )}
          {step < lastStep ? (
            <Button
              type="button"
              onClick={next}
              disabled={!current.valid}
              className="h-11 flex-1 rounded-full bg-[#800020] font-bold hover:bg-merlot text-white disabled:opacity-50"
            >
              {current.valid ? "Continue" : "Oops, add this first"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => submitListing(false)}
              disabled={submitting || savingDraft}
              className="h-11 flex-1 rounded-full bg-[#800020] font-bold hover:bg-merlot text-white disabled:opacity-50"
            >
              {submitting ? "Going live…" : listing ? "Save & go live" : "Go live"}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => submitListing(true)}
            disabled={savingDraft || submitting || name.trim().length < 2}
            className="h-11 shrink-0 rounded-full px-4 border-cream text-merlot hover:bg-cream/30"
          >
            {savingDraft ? "Saving…" : "Save draft"}
          </Button>
        </div>
      </div>
    </form>
  );
}

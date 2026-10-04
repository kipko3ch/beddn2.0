"use client";

import { useEffect, useState, useId } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import type { User } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Award,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Heart,
  HelpCircle,
  Info,
  MapPin,
  PenLine,
  ShieldCheck,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  Upload,
  UserCheck,
  Users,
  X,
} from "lucide-react";

interface ListingImage {
  id?: string;
  url?: string;
}

interface Host {
  name?: string | null;
  avatar_url?: string | null;
  is_verified?: boolean | null;
}

interface ListingProps {
  id: string;
  slug: string;
  title?: string | null;
  name?: string | null;
  city?: string | null;
  area?: string | null;
  country?: string | null;
  property_type?: string | null;
  is_verified?: boolean | null;
  listing_images?: ListingImage[];
  host?: Host | null;
}

const SUB_CATEGORIES = [
  { id: "cleanliness", label: "Cleanliness", allowNA: false },
  { id: "accuracy", label: "Accuracy of listing", allowNA: true },
  { id: "value", label: "Value for money", allowNA: false },
  { id: "location", label: "Location & safety", allowNA: false },
  { id: "check_in", label: "Check-in & host communication", allowNA: true },
] as const;

const TRIP_COMPANIONS = [
  "Solo",
  "Couples",
  "Family",
  "Friends",
  "Business",
] as const;

const MONTH_OPTIONS = [
  "October 2026",
  "September 2026",
  "August 2026",
  "July 2026",
  "June 2026",
  "May 2026",
  "Earlier in 2026",
  "2025 or earlier",
];

const HIGHLIGHT_TAGS = [
  { id: "clean", label: "Spotless clean" },
  { id: "safe", label: "Safe & secure" },
  { id: "good_host", label: "Responsive host" },
  { id: "accurate_photos", label: "Accurate photos" },
  { id: "easy_check_in", label: "Seamless check-in" },
  { id: "good_value", label: "Great value" },
  { id: "good_location", label: "Prime location" },
];

const WRITING_TOPICS = [
  { label: "Cleanliness", prompt: "The space was exceptionally clean and well-kept." },
  { label: "Check-in", prompt: "Check-in was quick, clear, and hassle-free." },
  { label: "Host", prompt: "The host was welcoming and always reachable." },
  { label: "Location", prompt: "The neighborhood was convenient and felt very safe." },
  { label: "Amenities", prompt: "The Wi-Fi was fast and all listed amenities worked smoothly." },
];

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: "Terrible",
  2: "Poor",
  3: "Average",
  4: "Very good",
  5: "Exceptional",
};

export function PropertyReviewClient({ listing }: { listing: ListingProps }) {
  const router = useRouter();
  const fileInputId = useId();

  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  // Form State
  const [overallRating, setOverallRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);

  const [subRatings, setSubRatings] = useState<Record<string, number | "NA">>({});
  const [hoverSubRatings, setHoverSubRatings] = useState<Record<string, number>>({});

  const [stayMonth, setStayMonth] = useState<string>("October 2026");
  const [tripType, setTripType] = useState<string>("Couples");

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [privateNote, setPrivateNote] = useState("");
  const [showPrivateNote, setShowPrivateNote] = useState(false);

  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(true);
  const [certified, setCertified] = useState(false);

  // Photos state (client-side previews)
  const [uploadedPhotos, setUploadedPhotos] = useState<
    { name: string; preview: string }[]
  >([]);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Check auth
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const listingTitle = listing.title || listing.name || "Beddn Stay";
  const listingLocation = [listing.area, listing.city, listing.country]
    .filter(Boolean)
    .join(", ");
  const mainPhoto =
    listing.listing_images?.[0]?.url ||
    "https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029375/empty-reviews_t8xgis.png";

  const handleSubRating = (catId: string, val: number | "NA") => {
    setSubRatings((prev) => ({ ...prev, [catId]: val }));
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const newItems = files.map((file) => ({
      name: file.name,
      preview: URL.createObjectURL(file),
    }));
    setUploadedPhotos((prev) => [...prev, ...newItems]);
  };

  const removePhoto = (index: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const applyTopicPrompt = (text: string) => {
    setComment((prev) => (prev ? `${prev.trim()} ${text}` : text));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!overallRating) {
      setErrorMsg("Please select an overall rating for your stay.");
      window.scrollTo({ top: 300, behavior: "smooth" });
      return;
    }

    if (!certified) {
      setErrorMsg("Please certify that your review is based on an authentic stay experience.");
      return;
    }

    if (!user) {
      setAuthOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing: listing.slug || listing.id,
          rating: overallRating,
          title: title.trim() || null,
          comment: comment.trim() || null,
          tags: selectedTags,
          wouldRecommend,
          privateNote: privateNote.trim() || null,
          stayDate: stayMonth,
          tripType,
          subRatings,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to submit review. Please try again.");
      }

      setSubmittedSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedSuccess) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-stone-200/90 bg-white p-8 sm:p-12 text-center shadow-md">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#fbf0f3] text-[#800020]">
            <CheckCircle2 className="h-10 w-10 text-[#800020]" />
          </div>

          <span className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-[#fbf0f3] px-3.5 py-1 text-xs font-semibold text-[#800020]">
            <Sparkles className="h-3.5 w-3.5" />
            Review Published
          </span>

          <h1 className="mt-3 font-serif text-3xl sm:text-4xl font-extrabold text-[#2b000a] tracking-tight">
            Thank you for sharing your experience!
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm sm:text-base leading-relaxed text-stone-600">
            Your review for <strong className="text-[#2b000a] font-semibold">{listingTitle}</strong> has been received. Your feedback helps future guests discover authentic stays and empowers our local hosts.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/property/${listing.slug}`}
              className="inline-flex items-center justify-center rounded-full bg-[#800020] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#600018] shadow-xs transition-colors"
            >
              View listing
            </Link>
            <Link
              href="/review"
              className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-6 py-2.5 text-sm font-bold text-[#241f21] hover:bg-stone-50 transition-colors"
            >
              Write another review
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 pb-36 sm:pb-24">
        {/* Breadcrumb / Back Link */}
        <div className="mb-6">
          <Link
            href={`/property/${listing.slug}`}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-stone-600 hover:text-[#800020] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to property
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          {/* ================= LEFT COLUMN ================= */}
          <aside className="lg:col-span-5 lg:sticky lg:top-24 self-start space-y-6">
            <div>
              <h1 className="font-brand text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#2b000a] tracking-tight leading-[1.1]">
                Tell us, how was your stay?
              </h1>
              <p className="mt-2 text-sm sm:text-base text-stone-600">
                Help travelers discover authentic experiences by sharing your genuine thoughts.
              </p>
            </div>

            {/* Property Card */}
            <div className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-3.5 shadow-sm transition hover:shadow-md">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-stone-100">
                <Image
                  src={mainPhoto}
                  alt={listingTitle}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 400px"
                  className="object-cover"
                />
                {listing.is_verified && (
                  <div className="absolute left-3 top-3">
                    <VerifiedBadge text="Verified Stay" size="xs" className="bg-white/95 backdrop-blur-xs shadow-xs" />
                  </div>
                )}
              </div>

              <div className="mt-3.5 px-1 pb-1">
                <h2 className="text-base font-bold text-[#181113] leading-snug line-clamp-2">
                  {listingTitle}
                </h2>

                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-stone-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[#800020]" />
                  <span className="truncate">{listingLocation || "Kenya"}</span>
                </div>

                {listing.host?.name && (
                  <div className="mt-2 flex items-center gap-2 pt-2 border-t border-stone-100 text-xs text-stone-600">
                    <div className="relative h-5 w-5 overflow-hidden rounded-full bg-stone-200">
                      {listing.host.avatar_url ? (
                        <Image
                          src={listing.host.avatar_url}
                          alt={listing.host.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <Users className="h-3 w-3 m-auto text-stone-400" />
                      )}
                    </div>
                    <span>Hosted by <strong className="font-semibold text-stone-800">{listing.host.name}</strong></span>
                  </div>
                )}

                <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                  <span className="text-stone-400">Not the right place?</span>
                  <Link
                    href="/review"
                    className="font-bold text-[#800020] hover:underline"
                  >
                    Change listing
                  </Link>
                </div>
              </div>
            </div>

            {/* Contributor Milestone Card */}
            <div className="rounded-2xl border border-[#800020]/15 bg-[#fbf0f3]/70 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#800020] shadow-xs">
                  <Award className="h-5 w-5 text-[#800020]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#800020]">
                    Become a Verified Contributor
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-stone-600">
                    Your firsthand review empowers African hospitality, assists fellow travelers, and provides honest feedback to hosts.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* ================= RIGHT COLUMN (FORM) ================= */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 sm:p-9 rounded-3xl border border-stone-200/90 shadow-sm">
              {/* Question 1: Overall Experience */}
              <section>
                <div className="flex items-baseline justify-between gap-2">
                  <label className="text-lg font-bold text-[#181113]">
                    How would you rate your experience? <span className="text-[#800020]">*</span>
                  </label>
                  {overallRating > 0 && (
                    <span className="text-sm font-bold text-[#800020]">
                      {RATING_DESCRIPTIONS[overallRating]}
                    </span>
                  )}
                </div>

                {/* TripAdvisor-style big circles */}
                <div className="mt-3 flex items-center gap-2.5">
                  {[1, 2, 3, 4, 5].map((val) => {
                    const activeRating = hoverRating || overallRating;
                    const isFilled = val <= activeRating;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setOverallRating(val)}
                        onMouseEnter={() => setHoverRating(val)}
                        onMouseLeave={() => setHoverRating(0)}
                        aria-label={`Rate ${val} out of 5 stars`}
                        className={`group relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border-2 transition-all ${
                          isFilled
                            ? "border-[#800020] bg-[#800020] text-white shadow-xs scale-105"
                            : "border-stone-300 bg-white text-stone-300 hover:border-[#800020] hover:text-[#800020]"
                        }`}
                      >
                        <span className={`text-sm font-black ${isFilled ? "text-white" : "text-stone-400 group-hover:text-[#800020]"}`}>
                          {val}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-xs text-stone-500">
                  Select a score from 1 (Terrible) to 5 (Exceptional).
                </p>
              </section>

              <hr className="border-stone-100" />

              {/* Question 2: Sub-category ratings */}
              <section className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-[#181113]">
                    How would you rate these?
                  </h3>
                  <p className="text-xs text-stone-500">
                    Rate specific aspects of your stay (optional).
                  </p>
                </div>

                <div className="divide-y divide-stone-100">
                  {SUB_CATEGORIES.map((cat) => {
                    const currentVal = subRatings[cat.id];
                    const hoverVal = hoverSubRatings[cat.id] || 0;
                    const displayVal = typeof currentVal === "number" ? currentVal : 0;
                    const activeVal = hoverVal || displayVal;
                    const isNA = currentVal === "NA";

                    return (
                      <div
                        key={cat.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2"
                      >
                        <span className="text-sm font-medium text-stone-700">
                          {cat.label}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5].map((val) => {
                            const isFilled = !isNA && val <= activeVal;
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() => handleSubRating(cat.id, val)}
                                onMouseEnter={() =>
                                  setHoverSubRatings((prev) => ({ ...prev, [cat.id]: val }))
                                }
                                onMouseLeave={() =>
                                  setHoverSubRatings((prev) => ({ ...prev, [cat.id]: 0 }))
                                }
                                aria-label={`${cat.label} ${val} stars`}
                                className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all ${
                                  isFilled
                                    ? "border-[#800020] bg-[#800020] text-white"
                                    : "border-stone-300 bg-white hover:border-[#800020]"
                                }`}
                              >
                                <span className={`text-[10px] font-bold ${isFilled ? "text-white" : "text-stone-300"}`}>
                                  ●
                                </span>
                              </button>
                            );
                          })}

                          {cat.allowNA && (
                            <button
                              type="button"
                              onClick={() => handleSubRating(cat.id, isNA ? 0 : "NA")}
                              className={`ml-2 rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                                isNA
                                  ? "border-[#800020] bg-[#fbf0f3] text-[#800020]"
                                  : "border-stone-200 text-stone-500 hover:border-stone-400"
                              }`}
                            >
                              N/A
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <hr className="border-stone-100" />

              {/* Question 3 & 4: When did you go & Who did you go with */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-[#181113]">
                    When did you stay?
                  </label>
                  <div className="relative mt-2">
                    <select
                      value={stayMonth}
                      onChange={(e) => setStayMonth(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 pr-9 text-sm font-medium text-stone-800 shadow-2xs focus:border-[#800020] focus:outline-none focus:ring-1 focus:ring-[#800020]"
                    >
                      {MONTH_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-stone-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#181113]">
                    Who did you travel with?
                  </label>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {TRIP_COMPANIONS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setTripType(item)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          tripType === item
                            ? "border-[#800020] bg-[#fbf0f3] text-[#800020] shadow-2xs"
                            : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Question 5: Highlights / standout tags */}
              <section>
                <label className="block text-sm font-bold text-[#181113]">
                  What stood out about this stay?
                </label>
                <p className="text-xs text-stone-500 mt-0.5">
                  Select all highlights that apply to help future travelers.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {HIGHLIGHT_TAGS.map((t) => {
                    const isSelected = selectedTags.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTag(t.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          isSelected
                            ? "border-[#800020] bg-[#800020] text-white shadow-xs"
                            : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              <hr className="border-stone-100" />

              {/* Question 6: Title your review */}
              <section>
                <label className="block text-sm font-bold text-[#181113]">
                  Title your review
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give us the gist of your experience (e.g., Peaceful oasis in Kilimani!)"
                  maxLength={120}
                  className="mt-2 block w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 shadow-2xs focus:border-[#800020] focus:outline-none focus:ring-1 focus:ring-[#800020]"
                />
              </section>

              {/* Question 7: Write your review */}
              <section>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-[#181113]">
                    Write your review
                  </label>
                  <span className="text-xs text-stone-400">
                    {comment.length} characters
                  </span>
                </div>

                {/* Prompt pills for inspiration */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-stone-400">Quick ideas:</span>
                  {WRITING_TOPICS.map((topic) => (
                    <button
                      key={topic.label}
                      type="button"
                      onClick={() => applyTopicPrompt(topic.prompt)}
                      className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-600 hover:bg-[#fbf0f3] hover:text-[#800020] transition"
                    >
                      + {topic.label}
                    </button>
                  ))}
                </div>

                <div className="mt-2 relative">
                  <Textarea
                    rows={5}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience... Tell future guests about the space, host communication, check-in, and anything that stood out during your stay."
                    className="w-full rounded-2xl border-stone-300 p-3.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#800020] focus:ring-[#800020]"
                  />
                </div>
              </section>

              {/* Question 8: Add photos (TripAdvisor style) */}
              <section>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#181113]">
                      Add some photos
                    </h4>
                    <p className="text-xs text-stone-500">
                      Optional · Upload your real photos to help future guests visualize the space.
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <input
                    id={fileInputId}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor={fileInputId}
                    className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50/60 p-6 text-center transition hover:border-[#800020] hover:bg-[#fbf0f3]/40"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#800020] shadow-xs">
                      <Camera className="h-5 w-5" />
                    </div>
                    <span className="mt-2 text-xs font-bold text-stone-700">
                      Click to add photos or drag and drop
                    </span>
                    <span className="mt-0.5 text-[11px] text-stone-400">
                      PNG, JPG up to 10MB each
                    </span>
                  </label>

                  {/* Thumbnail gallery */}
                  {uploadedPhotos.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {uploadedPhotos.map((photo, idx) => (
                        <div
                          key={idx}
                          className="group relative aspect-square overflow-hidden rounded-xl border border-stone-200 bg-stone-100"
                        >
                          <Image
                            src={photo.preview}
                            alt="Uploaded photo preview"
                            fill
                            className="object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(idx)}
                            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-90 transition hover:bg-red-600"
                            aria-label="Remove photo"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Private note for host toggle */}
              <section className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4">
                <button
                  type="button"
                  onClick={() => setShowPrivateNote((prev) => !prev)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <span className="text-xs font-bold text-stone-700">
                    Add a private note for the host? (Optional)
                  </span>
                  <span className="text-xs font-bold text-[#800020]">
                    {showPrivateNote ? "Hide" : "+ Add private feedback"}
                  </span>
                </button>

                {showPrivateNote && (
                  <div className="mt-3">
                    <p className="text-[11px] text-stone-500 mb-1.5">
                      This note will only be delivered directly to the host and will never appear on the public listing.
                    </p>
                    <Textarea
                      rows={3}
                      value={privateNote}
                      onChange={(e) => setPrivateNote(e.target.value)}
                      placeholder="e.g. The shower handle was slightly loose, or extra towels would be appreciated..."
                      className="w-full rounded-xl border-stone-300 bg-white p-3 text-xs text-stone-800"
                    />
                  </div>
                )}
              </section>

              {/* Would you recommend */}
              <section className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-bold text-[#181113]">
                  Would you recommend this property to others?
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWouldRecommend(true)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition ${
                      wouldRecommend === true
                        ? "border-[#1a7f46] bg-[#1a7f46]/10 text-[#1a7f46]"
                        : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                    }`}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    Yes, absolutely
                  </button>
                  <button
                    type="button"
                    onClick={() => setWouldRecommend(false)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition ${
                      wouldRecommend === false
                        ? "border-red-500 bg-red-50 text-red-600"
                        : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                    }`}
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                    No
                  </button>
                </div>
              </section>

              <hr className="border-stone-100" />

              {/* Certification Checkbox */}
              <section className="flex items-start gap-3">
                <input
                  id="certify-checkbox"
                  type="checkbox"
                  checked={certified}
                  onChange={(e) => setCertified(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-stone-300 text-[#800020] focus:ring-[#800020]"
                />
                <label
                  htmlFor="certify-checkbox"
                  className="cursor-pointer text-xs leading-relaxed text-stone-600"
                >
                  I certify that this review is based on my own experience and is my genuine opinion of this stay, and that I have no personal or business relationship with this property. I understand Beddn maintains zero tolerance for fake reviews.
                </label>
              </section>

              {/* Error Notice */}
              {errorMsg && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
                  {errorMsg}
                </div>
              )}

              {/* Submit Button */}
              <div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto min-w-[200px] rounded-full bg-[#800020] px-8 py-3.5 text-base font-bold text-white shadow-md hover:bg-[#600018] hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {submitting ? "Submitting review..." : "Submit review"}
                </Button>
                {!user && (
                  <p className="mt-2 text-xs text-stone-500">
                    You&apos;ll be prompted to sign in when submitting so your review is linked to your profile.
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>
      </main>

      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
      />
    </>
  );
}

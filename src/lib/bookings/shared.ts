import type { Listing, ListingCategory } from "@/lib/types";

export interface ReservationInput {
  listingId: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  category: ListingCategory;
  checkIn: string;
  checkOut?: string | null;
  startTime?: string | null;
  durationHours?: number | null;
  guestsCount: number;
  unitsReserved?: number;
  note?: string | null;
}

export interface BookingAmounts {
  totalAmount: number;
  depositAmount: number;
  platformFeeAmount: number;
  hostPayoutAmount: number;
  currency: string;
}

function parseClock(value: string | null | undefined, fallback: string) {
  return value && /^\d\d:\d\d/.test(value) ? value.slice(0, 5) : fallback;
}

export function listingTitle(listing: Partial<Listing>) {
  return listing.title || listing.name || "Beddn listing";
}

export function getListingCategories(listing: Partial<Listing>): ListingCategory[] {
  return (listing.category || listing.categories || []) as ListingCategory[];
}

export function buildBookingWindow(input: ReservationInput, listing: Partial<Listing>) {
  const category = input.category;
  const checkInTime = parseClock(listing.check_in_time, "14:00");
  const checkOutTime = parseClock(listing.check_out_time, "10:00");
  const startClock = parseClock(input.startTime, checkInTime);

  const start =
    category === "overnight"
      ? new Date(`${input.checkIn}T${checkInTime}:00`)
      : new Date(`${input.checkIn}T${startClock}:00`);

  let end: Date;
  if (category === "overnight") {
    if (!input.checkOut) {
      throw new Error("Check-out date is required for overnight bookings");
    }
    end = new Date(`${input.checkOut}T${checkOutTime}:00`);
  } else {
    const hours = Math.max(
      Number(input.durationHours || listing.minimum_hours || 1),
      Number(listing.minimum_hours || 1)
    );
    end = new Date(start.getTime() + hours * 60 * 60 * 1000);
  }

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new Error("Invalid booking date or time");
  }

  return {
    start,
    end,
    durationHours: Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 3600000)),
  };
}

export function calculateBookingAmounts(
  listing: Partial<Listing>,
  input: ReservationInput,
  start: Date,
  end: Date
): BookingAmounts {
  const currency = listing.currency || countryCurrency(listing.country);
  const category = input.category;
  const depositAmount = Number(listing.deposit_amount || 0);
  let totalAmount = depositAmount;

  if (category === "hourly" && listing.hourly_price) {
    const hours = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 3600000));
    totalAmount = Number(listing.hourly_price) * hours;
  }

  if (category === "overnight" && listing.overnight_price) {
    const nights = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
    );
    totalAmount = Number(listing.overnight_price) * nights;
  }

  if (category === "experience" && listing.experience_price) {
    totalAmount = Number(listing.experience_price);
  }

  const reserveFee = depositAmount > 0 ? depositAmount : totalAmount;
  const feeType = listing.platform_fee_type || "fixed";
  const feeValue = Number(listing.platform_fee_value || 0);
  const platformFeeAmount =
    feeType === "percentage" ? (reserveFee * feeValue) / 100 : feeValue;
  const cappedPlatformFee = Math.max(0, Math.min(reserveFee, platformFeeAmount));

  return {
    totalAmount,
    depositAmount: reserveFee,
    platformFeeAmount: cappedPlatformFee,
    hostPayoutAmount: Math.max(0, reserveFee - cappedPlatformFee),
    currency,
  };
}

export function countryCurrency(country?: string | null) {
  const normalized = (country || "").trim().toLowerCase();
  if (normalized === "kenya") return "KES";
  if (normalized === "tanzania" || normalized === "united republic of tanzania") {
    return process.env.NEXT_PUBLIC_DEFAULT_TZ_CURRENCY || "TZS";
  }
  return process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || "KES";
}

export function toPaystackSubunit(amount: number, currency: string) {
  const zeroDecimal = (process.env.PAYSTACK_ZERO_DECIMAL_CURRENCIES || "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  return zeroDecimal.includes(currency.toUpperCase())
    ? Math.round(amount)
    : Math.round(amount * 100);
}

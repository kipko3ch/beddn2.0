export type ListingCategory = "hourly" | "overnight" | "experience";
export type BookingMode = "manual_accept" | "auto_accept";
export type VerificationStatus = "pending" | "verified" | "rejected";
export type ListingStatus =
  | "draft"
  | "pending_review"
  | "active"
  | "paused"
  | "rejected"
  | "archived";

export type FeaturedPlacementType =
  | "homepage_featured"
  | "city_featured"
  | "category_featured"
  | "search_boost";

export type FeaturedStatus = "active" | "scheduled" | "expired" | "cancelled";
export type FeaturedPaymentStatus = "unpaid" | "paid" | "complimentary" | "refunded";
export type BookingStatus =
  | "draft"
  | "requested"
  | "pending_payment"
  | "payment_failed"
  | "paid_pending_host"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "completed"
  | "disputed"
  | "refunded";
export type PaymentStatus =
  | "initialized"
  | "success"
  | "failed"
  | "abandoned"
  | "refunded";
export type HostBalanceStatus = "held" | "withdrawable" | "withdrawn" | "reversed";
export type WithdrawalStatus = "requested" | "approved" | "paid" | "rejected";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface Host {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  bio?: string | null;
  avatar_url?: string | null;
  is_verified: boolean;
  created_at: string;
}

export interface Listing {
  id: string;
  host_id: string;
  slug: string;
  title?: string | null;
  name: string;
  description: string | null;
  country: string;
  city: string;
  area: string;
  property_type?: string | null;
  experience_types?: string[];
  private_address: string;
  check_in_instructions?: string | null;
  latitude: number;
  longitude: number;
  approximate_location_public?: boolean;
  categories: ListingCategory[];
  category?: ListingCategory[];
  hourly_price: number | null;
  overnight_price: number | null;
  experience_price: number | null;
  deposit_amount: number;
  currency?: string;
  total_units?: number;
  available_units?: number;
  booking_mode?: BookingMode;
  verification_status?: VerificationStatus;
  listing_status?: ListingStatus;
  rejection_reason?: string | null;
  platform_fee_type?: "fixed" | "percentage";
  platform_fee_value?: number;
  check_in_time?: string | null;
  check_out_time?: string | null;
  minimum_hours?: number;
  available_days?: number[];
  amenities: string[];
  house_rules: string | null;
  is_active: boolean;
  is_verified: boolean;
  experience_duration?: string | null;
  experience_meeting_point?: string | null;
  experience_group_size?: number | null;
  experience_requirements?: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  host?: Host;
  listing_images?: ListingImage[];
  reviews?: Review[];
}

export interface ListingImage {
  id: string;
  listing_id: string;
  url: string;
  position: number;
}

export interface FeaturedListing {
  id: string;
  listing_id: string;
  placement_type: FeaturedPlacementType;
  city: string | null;
  category: string | null;
  start_date: string;
  end_date: string;
  status: FeaturedStatus;
  payment_status: FeaturedPaymentStatus;
  amount: number;
  currency: string;
  priority: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  listing?: Listing | null;
}

export interface AvailabilityRule {
  id: string;
  listing_id: string;
  day_of_week: number | null;
  start_time: string | null;
  end_time: string | null;
  is_available: boolean;
}

export interface BlockedDate {
  id: string;
  listing_id: string;
  date: string;
  reason: string | null;
}

export interface Booking {
  id: string;
  listing_id: string;
  host_id?: string;
  user_id?: string | null;
  token?: string;
  booking_token?: string;
  guest_name: string;
  guest_phone: string;
  guest_email?: string | null;
  check_in: string;
  check_out: string | null;
  start_time: string | null;
  duration_hours: number | null;
  start_datetime?: string;
  end_datetime?: string;
  guests: number;
  guests_count?: number;
  units_reserved?: number;
  note: string | null;
  category: ListingCategory;
  status: BookingStatus;
  total_amount: number;
  deposit_amount?: number;
  platform_fee_amount?: number;
  host_payout_amount?: number;
  currency?: string;
  payment_id?: string | null;
  host_accepted_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  // Joined
  listing?: Listing;
}

export interface Payment {
  id: string;
  booking_id: string;
  provider?: "paystack" | string;
  provider_reference?: string;
  paystack_reference?: string;
  amount: number;
  currency?: string;
  status: PaymentStatus;
  payment_status?: PaymentStatus;
  method: string | null;
  reference: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  raw_response?: unknown;
  verified_at?: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  listing_id: string;
  user_id: string;
  booking_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  // Joined
  profile?: Profile;
}

export type AvailabilityStatus = "AVAILABLE" | "UNAVAILABLE" | "NEEDS_CONFIRMATION";
export type InquiryStatus = "NEW" | "CONTACTED" | "BOOKED" | "NOT_BOOKED" | "SPAM";

export interface Inquiry {
  id: string;
  listing_id: string;
  host_id: string | null;
  guest_user_id: string | null;
  guest_name: string;
  guest_whatsapp: string;
  category: string | null;
  check_in: string | null;
  check_out: string | null;
  hourly_slot: string | null;
  guests_count: number;
  message: string | null;
  availability_status: AvailabilityStatus;
  source: string;
  status: InquiryStatus;
  session_id: string | null;
  ip_hash: string | null;
  user_agent: string | null;
  utm_source: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  listing?: Listing;
}

export type InstructionType =
  | "CHECK_IN"
  | "HOUSE_RULE"
  | "ARRIVAL"
  | "PARKING"
  | "WIFI"
  | "SECURITY"
  | "LOCAL_TIP"
  | "GROUP_LINK"
  | "WEBSITE_LINK"
  | "ACTIVITY"
  | "NOTE"
  | "OTHER";

export type InstructionVisibility =
  | "PUBLIC"
  | "AFTER_LOGIN"
  | "AFTER_INQUIRY"
  | "PRIVATE_TO_CONFIRMED";

export interface ListingInstruction {
  id: string;
  listing_id: string;
  title: string;
  description: string | null;
  type: InstructionType;
  url: string | null;
  visibility: InstructionVisibility;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Instruction as returned to a guest: content is null when locked. */
export interface GuestInstruction {
  id: string;
  title: string;
  type: InstructionType;
  visibility: InstructionVisibility;
  locked: boolean;
  description: string | null;
  url: string | null;
}

export type ListingEventType =
  | "LISTING_VIEW"
  | "CALENDAR_DATE_SELECTED"
  | "AVAILABILITY_CHECKED"
  | "INQUIRY_STARTED"
  | "LOGIN_REQUIRED_FOR_CONTACT"
  | "INQUIRY_SUBMITTED"
  | "WHATSAPP_CLICK"
  | "EXPERIENCE_LINK_CLICK"
  | "GROUP_LINK_CLICK";

export interface ListingEvent {
  id: string;
  listing_id: string | null;
  user_id: string | null;
  event_type: ListingEventType;
  session_id: string | null;
  ip_hash: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SearchDemand {
  id: string;
  query: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  results_count: number;
  created_at: string;
}

export interface SavedTrip {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
  listing?: Listing;
}

export interface HostBalance {
  id: string;
  host_id: string;
  booking_id: string;
  amount: number;
  currency: string;
  status: HostBalanceStatus;
  available_at: string | null;
  created_at: string;
}

export interface Withdrawal {
  id: string;
  host_id: string;
  amount: number;
  currency: string;
  payout_method: string;
  payout_details: string;
  status: WithdrawalStatus;
  admin_note: string | null;
  created_at: string;
}

export interface Feedback {
  id: string;
  booking_id: string;
  rating: number;
  cleanliness: number | null;
  accuracy: number | null;
  safety: number | null;
  communication: number | null;
  comment: string | null;
  would_book_again: boolean | null;
  issue_reported: boolean;
  issue_type?: string | null;
  is_public_review: boolean;
  created_at: string;
}

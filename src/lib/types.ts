export type ListingCategory = "hourly" | "overnight" | "experience";

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
  is_verified: boolean;
  created_at: string;
}

export interface Listing {
  id: string;
  host_id: string;
  slug: string;
  name: string;
  description: string | null;
  country: string;
  city: string;
  area: string;
  private_address: string;
  latitude: number;
  longitude: number;
  categories: ListingCategory[];
  hourly_price: number | null;
  overnight_price: number | null;
  experience_price: number | null;
  deposit_amount: number;
  amenities: string[];
  house_rules: string | null;
  is_active: boolean;
  is_verified: boolean;
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
  token: string;
  guest_name: string;
  guest_phone: string;
  check_in: string;
  check_out: string | null;
  start_time: string | null;
  duration_hours: number | null;
  guests: number;
  note: string | null;
  category: ListingCategory;
  status: "pending" | "paid" | "completed" | "cancelled";
  total_amount: number;
  created_at: string;
  // Joined
  listing?: Listing;
}

export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  status: "pending" | "paid" | "failed";
  method: string | null;
  reference: string | null;
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

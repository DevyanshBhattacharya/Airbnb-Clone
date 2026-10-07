/**
 * TypeScript mirrors of the FastAPI Pydantic schemas.
 *
 * Keeping these hand-written (instead of code-generating them) is deliberate:
 * there are only a handful, and having them in one readable file makes the API
 * contract obvious. Each interface maps 1:1 to a schema in backend/schemas.py.
 */

export type Role = "guest" | "host" | "both";

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  role: Role;
}

/** A host profile with aggregated trust signals (superhost status, ratings). */
export interface Host extends User {
  is_superhost: boolean;
  avg_rating: number | null;
  reviews_count: number;
  listings_count: number;
}

export interface Amenity {
  id: number;
  name: string;
  icon_name: string;
}

export interface ListingImage {
  id: number;
  url: string;
  is_primary: boolean;
}

export interface Review {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
  user: User;
}

export interface DateRange {
  check_in: string; // ISO date, e.g. "2026-10-12"
  check_out: string;
}

export interface ListingCard {
  id: number;
  host_id: number;
  title: string;
  category: string;
  property_type: string;
  location: string;
  city: string;
  country: string;
  price_per_night: number;
  max_guests: number;
  bedrooms: number;
  beds: number;
  baths: number;
  latitude: number;
  longitude: number;
  created_at: string;
  primary_image: string | null;
  image_urls: string[];
  avg_rating: number | null;
  review_count: number;
  is_favorite: boolean;
}

export interface ListingDetail extends ListingCard {
  description: string;
  cleaning_fee: number;
  service_fee: number;
  host: Host;
  images: ListingImage[];
  amenities: Amenity[];
  reviews: Review[];
  booked_dates: DateRange[];
}

export interface PaginatedListings {
  items: ListingCard[];
  total: number;
  limit: number;
  offset: number;
}

export interface Booking {
  id: number;
  listing_id: number;
  user_id: number;
  check_in: string;
  check_out: string;
  total_price: number;
  guest_count: number;
  status: "confirmed" | "cancelled";
  created_at: string;
  listing_title: string | null;
  listing_city: string | null;
  listing_image: string | null;
  guest_name: string | null;
  nights: number | null;
  can_review: boolean;
  reviewed: boolean;
}

export interface HostStats {
  total_listings: number;
  total_reservations: number;
  total_earnings: number;
  upcoming_reservations: number;
}

export interface HostDashboard {
  host: Host;
  stats: HostStats;
  listings: ListingCard[];
  reservations: Booking[];
}

export interface FavoriteToggle {
  listing_id: number;
  favorited: boolean;
}

/** Payload the host form sends when creating or editing a listing. */
export interface ListingPayload {
  title: string;
  description: string;
  category: string;
  property_type: string;
  location: string;
  city: string;
  country: string;
  price_per_night: number;
  cleaning_fee: number;
  service_fee: number;
  max_guests: number;
  bedrooms: number;
  beds: number;
  baths: number;
  latitude: number;
  longitude: number;
  image_urls: string[];
  amenity_ids: number[];
}

/**
 * Thin typed wrapper around the FastAPI backend.
 *
 * Every request carries an `X-User-Id` header (the mock auth), which is why the
 * acting user's id is threaded through the helpers. `cache: "no-store"` keeps
 * browser fetch from serving stale data as favorites/bookings change.
 */

import type {
  Amenity,
  Booking,
  FavoriteToggle,
  HostDashboard,
  ListingDetail,
  ListingPayload,
  PaginatedListings,
  User,
} from "./types";

const RAW_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

/**
 * Base URL for API calls.
 *
 * - Local dev: `http://127.0.0.1:8000` (the FastAPI dev server).
 * - Vercel Services: set `NEXT_PUBLIC_API_URL="same-origin"` — the API is a
 *   sibling service mounted at `/api` on the same domain, so requests use
 *   relative URLs and no CORS is involved.
 */
export const API_BASE =
  RAW_BASE === "same-origin" ? "" : RAW_BASE.replace(/\/+$/, "");

/** Error type that carries the HTTP status so callers can branch on it. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  userId?: number;
}

async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.userId !== undefined) {
    headers["X-User-Id"] = String(options.userId);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    // FastAPI returns { detail: string | ValidationError[] } — surface the string.
    let detail = response.statusText;
    try {
      const data = await response.json();
      detail =
        typeof data?.detail === "string"
          ? data.detail
          : JSON.stringify(data?.detail ?? data);
    } catch {
      /* keep statusText */
    }
    throw new ApiError(response.status, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

function queryString(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

// --------------------------------------------------------------------------- //
// Users (mock auth)
// --------------------------------------------------------------------------- //
export function getUsers() {
  return apiFetch<User[]>("/api/users");
}

export function getMe(userId: number) {
  return apiFetch<User>("/api/users/me", { userId });
}

// --------------------------------------------------------------------------- //
// Listings
// --------------------------------------------------------------------------- //
export interface ListingQuery {
  q?: string;
  city?: string;
  category?: string;
  min_price?: number;
  max_price?: number;
  guests?: number;
  check_in?: string;
  check_out?: string;
  limit?: number;
  offset?: number;
}

export function getListings(query: ListingQuery = {}, userId?: number) {
  return apiFetch<PaginatedListings>(`/api/listings${queryString(query)}`, { userId });
}

export function getListing(id: number, userId?: number) {
  return apiFetch<ListingDetail>(`/api/listings/${id}`, { userId });
}

export function getAmenities() {
  return apiFetch<Amenity[]>("/api/amenities");
}

export function getCategories() {
  return apiFetch<string[]>("/api/categories");
}

export function createListing(payload: ListingPayload, userId: number) {
  return apiFetch<ListingDetail>("/api/listings", {
    method: "POST",
    body: payload,
    userId,
  });
}

export function updateListing(id: number, payload: Partial<ListingPayload>, userId: number) {
  return apiFetch<ListingDetail>(`/api/listings/${id}`, {
    method: "PUT",
    body: payload,
    userId,
  });
}

export function deleteListing(id: number, userId: number) {
  return apiFetch<void>(`/api/listings/${id}`, { method: "DELETE", userId });
}

// --------------------------------------------------------------------------- //
// Bookings
// --------------------------------------------------------------------------- //
export interface BookingPayload {
  listing_id: number;
  check_in: string;
  check_out: string;
  guest_count: number;
}

export function createBooking(payload: BookingPayload, userId: number) {
  return apiFetch<Booking>("/api/bookings", { method: "POST", body: payload, userId });
}

export function getMyTrips(userId: number) {
  return apiFetch<Booking[]>("/api/bookings/my-trips", { userId });
}

export function cancelBooking(id: number, userId: number) {
  return apiFetch<Booking>(`/api/bookings/${id}`, { method: "DELETE", userId });
}

export function getHostDashboard(userId: number) {
  return apiFetch<HostDashboard>("/api/host/dashboard", { userId });
}

// --------------------------------------------------------------------------- //
// Favorites
// --------------------------------------------------------------------------- //
export function getFavorites(userId: number) {
  return apiFetch<import("./types").ListingCard[]>("/api/favorites", { userId });
}

export function toggleFavorite(listingId: number, userId: number) {
  return apiFetch<FavoriteToggle>(`/api/favorites/${listingId}`, {
    method: "POST",
    userId,
  });
}

// --------------------------------------------------------------------------- //
// Reviews
// --------------------------------------------------------------------------- //
export interface ReviewPayload {
  booking_id: number;
  rating: number;
  comment: string;
}

export function createReview(payload: ReviewPayload, userId: number) {
  return apiFetch<import("./types").Review>("/api/reviews", {
    method: "POST",
    body: payload,
    userId,
  });
}

// --------------------------------------------------------------------------- //
// Uploads
// --------------------------------------------------------------------------- //
export interface UploadResponse {
  url: string;
}

/**
 * Upload an image file. Uses `fetch` directly (not apiFetch) because FormData
 * sets its own multipart Content-Type — overriding it would break the request.
 */
export async function uploadImage(file: File, userId: number): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch(`${API_BASE}/api/uploads`, {
    method: "POST",
    headers: { "X-User-Id": String(userId) },
    body: form,
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const data = await response.json();
      detail =
        typeof data?.detail === "string" ? data.detail : JSON.stringify(data?.detail ?? data);
    } catch {
      /* keep statusText */
    }
    throw new ApiError(response.status, detail);
  }

  return (await response.json()) as UploadResponse;
}

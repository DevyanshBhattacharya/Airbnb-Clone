"use client";

import { Bath, BedDouble, DoorOpen, Heart, Share, Users } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { AmenityGrid } from "@/components/AmenityGrid";
import { BookingWidget } from "@/components/BookingWidget";
import { ListingMap } from "@/components/ListingMap";
import { PhotoGrid } from "@/components/PhotoGrid";
import { ReviewsSection } from "@/components/ReviewsSection";
import { SuperhostBadge } from "@/components/SuperhostBadge";
import { useToast } from "@/context/ToastContext";
import { useUser } from "@/context/UserContext";
import { getListing, toggleFavorite } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { ListingDetail } from "@/lib/types";

/** Full listing detail page: photos, host, amenities, map, reviews + booking. */
export function ListingDetailView({ listingId }: { listingId: number }) {
  const { user } = useUser();
  const toast = useToast();

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getListing(listingId, user?.id)
      .then((data) => {
        setListing(data);
        setFavorited(data.is_favorite);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [listingId, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!user) return;
    try {
      const result = await toggleFavorite(listingId, user.id);
      setFavorited(result.favorited);
      toast.success(result.favorited ? "Saved to your wishlist" : "Removed from your wishlist");
    } catch {
      toast.error("Could not update your wishlist");
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: listing?.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      }
    } catch {
      /* user cancelled — no-op */
    }
  };

  if (loading) return <DetailSkeleton />;

  if (error || !listing) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">Listing not found</h1>
        <p className="mt-2 text-sm text-muted">{error ?? "This listing may have been removed."}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-6 pb-24 lg:pb-6">
      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold">{listing.title}</h1>
        <div className="flex shrink-0 items-center gap-5 text-sm">
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-2 font-medium underline hover:text-ink"
          >
            <Share className="h-4 w-4" />
            Share
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 font-medium underline hover:text-ink"
          >
            <Heart className={`h-4 w-4 ${favorited ? "fill-rausch text-rausch" : ""}`} />
            {favorited ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      <p className="mt-1 text-sm">
        {listing.avg_rating !== null && (
          <>
            <span className="font-semibold">★ {listing.avg_rating.toFixed(1)}</span>
            <span className="text-muted">
              {" "}
              · {listing.review_count} reviews ·{" "}
            </span>
          </>
        )}
        <span className="text-muted">
          {listing.location}, {listing.city}, {listing.country}
        </span>
      </p>

      <PhotoGrid images={listing.images} title={listing.title} />

      {/* Two-column layout: content + sticky booking card */}
      <div className="mt-8 grid gap-12 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* Host + quick facts */}
          <section className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-semibold">
                  {listing.property_type} hosted by {listing.host.name}
                </h2>
                {listing.host.is_superhost && <SuperhostBadge />}
              </div>
              <p className="mt-1 text-sm text-muted">
                {listing.host.listings_count} listing
                {listing.host.listings_count === 1 ? "" : "s"} ·{" "}
                {listing.host.reviews_count} reviews
                {listing.host.avg_rating !== null && ` · ★ ${listing.host.avg_rating}`}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
                <Fact icon={<Users className="h-4 w-4" />} label={`${listing.max_guests} guests`} />
                <Fact icon={<DoorOpen className="h-4 w-4" />} label={`${listing.bedrooms} bedrooms`} />
                <Fact icon={<BedDouble className="h-4 w-4" />} label={`${listing.beds} beds`} />
                <Fact icon={<Bath className="h-4 w-4" />} label={`${listing.baths} baths`} />
              </div>
            </div>
            {listing.host.avatar_url && (
              <Image
                src={listing.host.avatar_url}
                alt={listing.host.name}
                width={56}
                height={56}
                className="h-14 w-14 rounded-full object-cover"
              />
            )}
          </section>

          <hr className="border-hairline-soft" />

          <section>
            <p className="whitespace-pre-line text-ink/90">{listing.description}</p>
          </section>

          {listing.amenities.length > 0 && (
            <>
              <hr className="border-hairline-soft" />
              <section>
                <h2 className="mb-4 text-xl font-semibold">What this place offers</h2>
                <AmenityGrid amenities={listing.amenities} />
              </section>
            </>
          )}

          <hr className="border-hairline-soft" />

          <section>
            <h2 className="mb-4 text-xl font-semibold">Where you&apos;ll be</h2>
            <ListingMap
              id={listing.id}
              title={listing.title}
              price={listing.price_per_night}
              image={listing.primary_image}
              latitude={listing.latitude}
              longitude={listing.longitude}
              location={listing.location}
              city={listing.city}
            />
          </section>

          <hr className="border-hairline-soft" />

          <section>
            <h2 className="mb-6 text-xl font-semibold">
              {listing.review_count} reviews
            </h2>
            <ReviewsSection reviews={listing.reviews} avgRating={listing.avg_rating} />
          </section>
        </div>

        {/* Sticky booking widget */}
        <aside id="booking" className="lg:col-span-1">
          <div className="lg:sticky lg:top-24">
            <BookingWidget listing={listing} userId={user?.id} onBooked={load} />
          </div>
        </aside>
      </div>

      {/* Mobile: sticky price + Reserve bar (Airbnb pattern). */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t border-hairline bg-canvas px-4 py-3 lg:hidden">
        <div>
          <p className="font-semibold">
            {formatPrice(listing.price_per_night)}{" "}
            <span className="font-normal text-muted">night</span>
          </p>
          {listing.avg_rating !== null && (
            <p className="text-xs text-muted">
              ★ {listing.avg_rating.toFixed(1)} · {listing.review_count} reviews
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() =>
            document
              .getElementById("booking")
              ?.scrollIntoView({ behavior: "smooth", block: "center" })
          }
          className="rounded-xl bg-rausch px-6 py-3 font-semibold text-white transition-colors hover:bg-rausch-dark"
        >
          Reserve
        </button>
      </div>
    </div>
  );
}

function Fact({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-2">
      {icon}
      {label}
    </span>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-6 py-6">
      <div className="h-7 w-2/3 rounded bg-hairline-soft" />
      <div className="mt-3 h-4 w-1/3 rounded bg-hairline-soft" />
      <div className="mt-4 h-[300px] rounded-2xl bg-hairline-soft md:h-[420px]" />
      <div className="mt-8 grid gap-12 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="h-6 w-1/2 rounded bg-hairline-soft" />
          <div className="h-4 w-full rounded bg-hairline-soft" />
          <div className="h-4 w-5/6 rounded bg-hairline-soft" />
        </div>
        <div className="h-72 rounded-2xl bg-hairline-soft" />
      </div>
    </div>
  );
}

"use client";

import { Map as MapIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { CategoryBar } from "@/components/CategoryBar";
import { LeafletMap } from "@/components/LeafletMap";
import type { MapMarker } from "@/components/LeafletMapInner";
import { ListingCard } from "@/components/ListingCard";
import { useSearch } from "@/context/SearchContext";
import { useUser } from "@/context/UserContext";
import { API_BASE, getListings } from "@/lib/api";
import type { ListingCard as ListingCardType } from "@/lib/types";

/**
 * Marketplace home. Fetches listings client-side whenever the shared search
 * filters (or the acting user, for wishlist state) change, and can flip between
 * a card grid and a split list + interactive map.
 */
export default function HomePage() {
  const { filters } = useSearch();
  const { user } = useUser();

  const [listings, setListings] = useState<ListingCardType[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);

    getListings(
      {
        city: filters.city || undefined,
        category: filters.category || undefined,
        guests: filters.guests || undefined,
        check_in: filters.checkIn || undefined,
        check_out: filters.checkOut || undefined,
        limit: 100,
      },
      user?.id
    )
      .then((data) => {
        if (!active) return;
        setListings(data.items);
        setTotal(data.total);
        setError(null);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters, user?.id]);

  const heading = filters.city
    ? `Stays in ${filters.city}`
    : filters.category
      ? `${filters.category} stays`
      : "Explore stays";

  const mapMarkers: MapMarker[] = listings.map((listing) => ({
    id: listing.id,
    title: listing.title,
    price: listing.price_per_night,
    latitude: listing.latitude,
    longitude: listing.longitude,
    image: listing.primary_image,
    city: listing.city,
  }));

  return (
    <>
      <CategoryBar />

      <section className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-xl font-semibold">{heading}</h1>
            {!loading && !error && (
              <p className="text-sm text-muted">
                {total} {total === 1 ? "home" : "homes"}
              </p>
            )}
          </div>
          {!error && !loading && listings.length > 0 && (
            <button
              type="button"
              onClick={() => setShowMap((value) => !value)}
              className="flex items-center gap-2 rounded-full border border-hairline px-4 py-2 text-sm font-medium hover:bg-surface"
            >
              <MapIcon className="h-4 w-4" />
              {showMap ? "Show list" : "Show map"}
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-2xl border border-hairline p-8 text-center">
            <p className="font-medium">We couldn&apos;t load listings.</p>
            <p className="mt-1 text-sm text-muted">{error}</p>
            <p className="mt-4 text-sm text-muted">
              API target: {API_BASE || "same origin (/api)"}
            </p>
          </div>
        )}

        {!error && loading && <ListingGridSkeleton />}

        {!error && !loading && listings.length === 0 && (
          <div className="rounded-2xl border border-hairline p-12 text-center">
            <p className="text-lg font-semibold">No exact matches</p>
            <p className="mt-1 text-sm text-muted">
              Try changing your filters or searching a different city.
            </p>
          </div>
        )}

        {!error && !loading && listings.length > 0 && !showMap && (
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        {!error && !loading && listings.length > 0 && showMap && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Desktop: cards beside the map. Mobile: map only. */}
            <div className="hidden grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
            <div className="h-[70vh] overflow-hidden rounded-2xl border border-hairline lg:sticky lg:top-32 lg:h-[calc(100vh-9rem)]">
              <LeafletMap markers={mapMarkers} />
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function ListingGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="aspect-square w-full rounded-2xl bg-hairline-soft" />
          <div className="mt-3 h-4 w-3/4 rounded bg-hairline-soft" />
          <div className="mt-2 h-3 w-1/2 rounded bg-hairline-soft" />
        </div>
      ))}
    </div>
  );
}

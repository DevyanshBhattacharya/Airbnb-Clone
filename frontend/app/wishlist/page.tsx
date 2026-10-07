"use client";

import { useEffect, useState } from "react";

import { ListingCard } from "@/components/ListingCard";
import { useUser } from "@/context/UserContext";
import { getFavorites } from "@/lib/api";
import type { ListingCard as ListingCardType } from "@/lib/types";

/** The acting user's wishlist, populated by the heart button on each card. */
export default function WishlistPage() {
  const { user } = useUser();
  const [listings, setListings] = useState<ListingCardType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    getFavorites(user.id)
      .then((data) => {
        if (active) setListings(data);
      })
      .catch(() => {
        if (active) setListings([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="text-3xl font-semibold">Wishlists</h1>
      <p className="mt-1 text-sm text-muted">
        Homes you&apos;ve saved by tapping the heart.
      </p>

      {loading && (
        <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="aspect-square w-full rounded-2xl bg-hairline-soft" />
              <div className="mt-3 h-4 w-3/4 rounded bg-hairline-soft" />
            </div>
          ))}
        </div>
      )}

      {!loading && listings.length === 0 && (
        <div className="mt-8 rounded-2xl border border-hairline p-12 text-center">
          <p className="text-lg font-semibold">No saved homes yet</p>
          <p className="mt-1 text-sm text-muted">
            Tap the heart on any listing to add it here.
          </p>
        </div>
      )}

      {!loading && listings.length > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}

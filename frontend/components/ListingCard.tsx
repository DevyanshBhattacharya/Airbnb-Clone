"use client";

import { ChevronLeft, ChevronRight, Heart, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { toggleFavorite } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { ListingCard as ListingCardType } from "@/lib/types";
import { useToast } from "@/context/ToastContext";
import { useUser } from "@/context/UserContext";

/**
 * A single marketplace card: photo with an image slider + wishlist heart,
 * a location/rating row, the title, and the nightly price.
 */
export function ListingCard({ listing }: { listing: ListingCardType }) {
  const { user } = useUser();
  const toast = useToast();

  const images =
    listing.image_urls.length > 0
      ? listing.image_urls
      : listing.primary_image
        ? [listing.primary_image]
        : [];

  const [index, setIndex] = useState(0);
  // Optimistic favorite state so the heart responds instantly.
  const [favorited, setFavorited] = useState(listing.is_favorite);
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  const step = (delta: number) => {
    if (images.length < 2) return;
    setIndex((current) => (current + delta + images.length) % images.length);
  };

  const handleFavorite = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user || favoriteBusy) return;

    setFavoriteBusy(true);
    const previous = favorited;
    setFavorited(!previous); // optimistic
    try {
      const result = await toggleFavorite(listing.id, user.id);
      setFavorited(result.favorited);
      toast.success(
        result.favorited ? "Saved to your wishlist" : "Removed from your wishlist"
      );
    } catch {
      setFavorited(previous); // roll back
      toast.error("Could not update your wishlist");
    } finally {
      setFavoriteBusy(false);
    }
  };

  return (
    <div className="group">
      {/* Photo + all overlays live in one relative wrapper. */}
      <div className="relative">
        <Link
          href={`/listings/${listing.id}`}
          className="block overflow-hidden rounded-2xl"
          aria-label={listing.title}
        >
          <div className="relative aspect-square w-full bg-hairline-soft">
            {images.length > 0 ? (
              images.map((url, imageIndex) => (
                <Image
                  key={url + imageIndex}
                  src={url}
                  alt={listing.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className={`object-cover transition-opacity duration-300 ${
                    imageIndex === index ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-soft">
                No photo
              </div>
            )}
          </div>
        </Link>

        {/* Wishlist heart */}
        <button
          type="button"
          onClick={handleFavorite}
          aria-label={favorited ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={favorited}
          className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center transition-transform hover:scale-110"
        >
          <Heart
            className={`h-6 w-6 drop-shadow ${
              favorited ? "fill-rausch text-rausch" : "fill-black/40 text-white"
            }`}
            strokeWidth={2}
          />
        </button>

        {/* Slider controls */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow transition-opacity group-hover:opacity-100 md:grid"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow transition-opacity group-hover:opacity-100 md:grid"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
              {images.map((url, imageIndex) => (
                <span
                  key={url + imageIndex}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    imageIndex === index ? "bg-white" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Text block (also links to the detail page) */}
      <Link href={`/listings/${listing.id}`} className="mt-3 block">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-medium">
            {listing.city}, {listing.country}
          </p>
          {listing.avg_rating !== null && (
            <span className="flex shrink-0 items-center gap-1 text-sm">
              <Star className="h-3.5 w-3.5 fill-ink text-ink" />
              {listing.avg_rating.toFixed(1)}
            </span>
          )}
        </div>
        <p className="truncate text-sm text-muted">{listing.title}</p>
        <p className="mt-1 text-sm text-muted">
          {listing.bedrooms} bedrooms · {listing.max_guests} guests
        </p>
        <p className="mt-1">
          <span className="font-semibold">{formatPrice(listing.price_per_night)}</span>{" "}
          <span className="text-muted">night</span>
        </p>
      </Link>
    </div>
  );
}

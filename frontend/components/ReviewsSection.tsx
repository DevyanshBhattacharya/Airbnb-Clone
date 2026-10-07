"use client";

import { Star } from "lucide-react";
import Image from "next/image";

import { formatMonthYear } from "@/lib/format";
import type { Review } from "@/lib/types";

/**
 * Reviews: an overall rating with a 5→1 star breakdown on the left, and the
 * individual review cards on the right. The breakdown is computed on the
 * client from the reviews the API already returned.
 */
export function ReviewsSection({
  reviews,
  avgRating,
}: {
  reviews: Review[];
  avgRating: number | null;
}) {
  const total = reviews.length;

  const breakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((review) => review.rating === star).length,
  }));

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div>
        <div className="flex items-center gap-3">
          <span className="text-6xl font-semibold">
            {avgRating !== null ? avgRating.toFixed(1) : "—"}
          </span>
          <Star className="h-7 w-7 fill-ink text-ink" />
        </div>
        <p className="mt-2 text-sm font-medium">
          {total} {total === 1 ? "review" : "reviews"}
        </p>

        <div className="mt-5 space-y-2">
          {breakdown.map(({ star, count }) => (
            <div key={star} className="flex items-center gap-3 text-xs">
              <span className="w-3 text-muted">{star}</span>
              <div className="h-1 w-40 overflow-hidden rounded-full bg-hairline-soft">
                <div
                  className="h-full rounded-full bg-ink"
                  style={{ width: total > 0 ? `${(count / total) * 100}%` : "0%" }}
                />
              </div>
              <span className="text-muted">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        {reviews.map((review) => (
          <article key={review.id}>
            <header className="flex items-center gap-3">
              {review.user.avatar_url ? (
                <Image
                  src={review.user.avatar_url}
                  alt={review.user.name}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <span className="h-10 w-10 rounded-full bg-hairline-soft" />
              )}
              <div>
                <p className="text-sm font-semibold">{review.user.name}</p>
                <p className="text-xs text-muted">{formatMonthYear(review.created_at)}</p>
              </div>
            </header>
            <p className="mt-3 line-clamp-4 text-sm text-ink/90">{review.comment}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

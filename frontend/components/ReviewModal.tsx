"use client";

import { Star, X } from "lucide-react";
import { useState } from "react";

import { useToast } from "@/context/ToastContext";
import { createReview } from "@/lib/api";
import type { Booking } from "@/lib/types";

/**
 * "Leave a review" modal, opened from a completed stay in My Trips.
 * Rating is a 5-star picker; the backend enforces that the stay is finished and
 * not already reviewed.
 */
export function ReviewModal({
  booking,
  userId,
  onClose,
  onSubmitted,
}: {
  booking: Booking;
  userId: number;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const toast = useToast();

  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = hover || rating;

  const submit = async () => {
    if (comment.trim().length < 1) {
      setError("Please write a short review.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createReview(
        { booking_id: booking.id, rating, comment: comment.trim() },
        userId
      );
      toast.success("Review posted — thank you!");
      onSubmitted();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not post your review";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Leave a review"
        className="w-full max-w-md rounded-2xl bg-canvas p-6 shadow-modal"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Leave a review</h2>
            <p className="text-sm text-muted">{booking.listing_title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close review"
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Star picker */}
        <div className="mb-4">
          <p className="mb-1.5 text-sm font-medium">Your rating</p>
          <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                onMouseEnter={() => setHover(value)}
                aria-label={`${value} star${value > 1 ? "s" : ""}`}
                className="p-0.5 transition-transform hover:scale-110"
              >
                <Star
                  className={`h-8 w-8 ${
                    value <= active ? "fill-rausch text-rausch" : "text-hairline"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Your review</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
            placeholder="What stood out about this stay?"
            className="input resize-y"
          />
        </label>

        {error && <p className="mt-3 text-xs text-rausch">{error}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="mt-5 w-full rounded-xl bg-rausch py-3.5 font-semibold text-white transition-colors hover:bg-rausch-dark disabled:opacity-60"
        >
          {submitting ? "Posting…" : "Post review"}
        </button>
      </div>
    </div>
  );
}

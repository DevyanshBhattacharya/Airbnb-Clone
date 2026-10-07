"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ReviewModal } from "@/components/ReviewModal";
import { useToast } from "@/context/ToastContext";
import { useUser } from "@/context/UserContext";
import { cancelBooking, getMyTrips } from "@/lib/api";
import { formatPrice, formatShortDate, todayISO } from "@/lib/format";
import type { Booking } from "@/lib/types";

/**
 * "My trips": the acting user's bookings, split into upcoming and past.
 * Upcoming confirmed trips can be cancelled; completed stays can be reviewed.
 */
export default function TripsPage() {
  const { user } = useUser();
  const toast = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  // "Today" is read on the client after mount, not during prerender, so the
  // current time never gets baked into the static shell.
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(todayISO());
  }, []);

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    getMyTrips(user.id)
      .then(setBookings)
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCancel = async (booking: Booking) => {
    if (!user) return;
    setCancellingId(booking.id);
    try {
      const updated = await cancelBooking(booking.id, user.id);
      setBookings((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      toast.success("Booking cancelled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel booking");
    } finally {
      setCancellingId(null);
    }
  };

  const upcoming = bookings.filter(
    (booking) => booking.status === "confirmed" && booking.check_out >= today
  );
  const past = bookings.filter(
    (booking) => booking.status === "cancelled" || booking.check_out < today
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-semibold">My trips</h1>
      <p className="mt-1 text-sm text-muted">Your reservations, as a guest.</p>

      {loading && (
        <div className="mt-8 space-y-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl bg-hairline-soft" />
          ))}
        </div>
      )}

      {!loading && bookings.length === 0 && (
        <div className="mt-8 rounded-2xl border border-hairline p-12 text-center">
          <p className="text-lg font-semibold">No trips yet</p>
          <p className="mt-1 text-sm text-muted">
            Once you book a stay it will show up here.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-rausch px-6 py-3 font-semibold text-white hover:bg-rausch-dark"
          >
            Start exploring
          </Link>
        </div>
      )}

      {!loading && upcoming.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Upcoming</h2>
          <div className="mt-4 space-y-4">
            {upcoming.map((booking) => (
              <TripCard
                key={booking.id}
                booking={booking}
                canCancel
                cancelling={cancellingId === booking.id}
                onCancel={() => handleCancel(booking)}
              />
            ))}
          </div>
        </section>
      )}

      {!loading && past.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Past & cancelled</h2>
          <div className="mt-4 space-y-4">
            {past.map((booking) => (
              <TripCard
                key={booking.id}
                booking={booking}
                onReview={booking.can_review ? () => setReviewBooking(booking) : undefined}
              />
            ))}
          </div>
        </section>
      )}

      {reviewBooking && user && (
        <ReviewModal
          booking={reviewBooking}
          userId={user.id}
          onClose={() => setReviewBooking(null)}
          onSubmitted={() => {
            setReviewBooking(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function TripCard({
  booking,
  canCancel = false,
  cancelling = false,
  onCancel,
  onReview,
}: {
  booking: Booking;
  canCancel?: boolean;
  cancelling?: boolean;
  onCancel?: () => void;
  onReview?: () => void;
}) {
  const cancelled = booking.status === "cancelled";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-hairline p-4 sm:flex-row sm:items-center">
      <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl bg-hairline-soft sm:h-28 sm:w-40">
        {booking.listing_image && (
          <Image
            src={booking.listing_image}
            alt={booking.listing_title ?? "Listing"}
            fill
            sizes="(max-width: 640px) 100vw, 160px"
            className="object-cover"
          />
        )}
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{booking.listing_title}</h3>
          {cancelled && (
            <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-muted">
              Cancelled
            </span>
          )}
          {booking.reviewed && (
            <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-muted">
              Reviewed
            </span>
          )}
        </div>
        <p className="text-sm text-muted">{booking.listing_city}</p>
        <p className="mt-1 text-sm">
          {formatShortDate(booking.check_in)} – {formatShortDate(booking.check_out)}
          {" · "}
          {booking.nights} night{booking.nights === 1 ? "" : "s"} · {booking.guest_count} guest
          {booking.guest_count > 1 ? "s" : ""}
        </p>
        <p className="mt-1 text-sm font-semibold">{formatPrice(booking.total_price)} total</p>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        <Link
          href={`/listings/${booking.listing_id}`}
          className="rounded-lg border border-hairline px-4 py-2 text-sm font-medium hover:bg-surface"
        >
          View listing
        </Link>
        {onReview && (
          <button
            type="button"
            onClick={onReview}
            className="rounded-lg bg-rausch px-4 py-2 text-sm font-semibold text-white hover:bg-rausch-dark"
          >
            Leave a review
          </button>
        )}
        {canCancel && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelling}
            className="rounded-lg border border-hairline px-4 py-2 text-sm font-medium text-rausch hover:bg-surface disabled:opacity-50"
          >
            {cancelling ? "Cancelling…" : "Cancel"}
          </button>
        )}
      </div>
    </div>
  );
}

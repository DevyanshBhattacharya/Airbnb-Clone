"use client";

import { Minus, Plus, Star, X } from "lucide-react";
import { useMemo, useState } from "react";

import { DateRangeCalendar } from "@/components/DateRangeCalendar";
import { useToast } from "@/context/ToastContext";
import { createBooking } from "@/lib/api";
import {
  formatPrice,
  formatShortDate,
  nightsBetween,
  overlapsBooked,
  todayISO,
} from "@/lib/format";
import type { ListingDetail } from "@/lib/types";

/**
 * Sticky booking card. It validates the chosen dates against the listing's
 * already-booked ranges (fetched from the API), shows a live price breakdown,
 * and opens a mocked checkout that creates a real booking on confirm.
 */
export function BookingWidget({
  listing,
  userId,
  onBooked,
}: {
  listing: ListingDetail;
  userId?: number;
  onBooked: () => void;
}) {
  const toast = useToast();

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const nights = nightsBetween(checkIn, checkOut);

  const pricing = useMemo(() => {
    const subtotal = nights * listing.price_per_night;
    const total = subtotal + listing.cleaning_fee + listing.service_fee;
    return { subtotal, total };
  }, [nights, listing.price_per_night, listing.cleaning_fee, listing.service_fee]);

  // Live validation — the reserve button stays disabled until this is null.
  const validationError = useMemo(() => {
    if (checkIn && checkIn < todayISO()) return "Check-in can't be in the past.";
    if (checkIn && checkOut && nights <= 0) return "Check-out must be after check-in.";
    if (checkIn && checkOut && overlapsBooked(checkIn, checkOut, listing.booked_dates)) {
      return "Those dates are already booked. Please pick another range.";
    }
    if (guests > listing.max_guests) {
      return `This place hosts up to ${listing.max_guests} guests.`;
    }
    return null;
  }, [checkIn, checkOut, nights, guests, listing.booked_dates, listing.max_guests]);

  const canReserve =
    Boolean(userId) &&
    Boolean(checkIn) &&
    Boolean(checkOut) &&
    nights > 0 &&
    !validationError;

  const handleConfirm = async () => {
    if (!userId || !canReserve) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createBooking(
        { listing_id: listing.id, check_in: checkIn, check_out: checkOut, guest_count: guests },
        userId
      );
      toast.success("Booking confirmed! Your trip is reserved.");
      setCheckoutOpen(false);
      setCheckIn("");
      setCheckOut("");
      setGuests(1);
      onBooked(); // refetch so the calendar reflects the new booking
    } catch (error) {
      const message = error instanceof Error ? error.message : "Booking failed";
      setSubmitError(message);
      toast.error("Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-hairline p-6 shadow-card">
        <div className="flex items-baseline justify-between">
          <p>
            <span className="text-xl font-semibold">
              {formatPrice(listing.price_per_night)}
            </span>{" "}
            <span className="text-muted">night</span>
          </p>
          {listing.avg_rating !== null && (
            <span className="flex items-center gap-1 text-sm">
              <Star className="h-3.5 w-3.5 fill-ink text-ink" />
              {listing.avg_rating.toFixed(1)} · {listing.review_count} reviews
            </span>
          )}
        </div>

        {/* Date + guest fields, styled as Airbnb's joined box */}
        <div className="mt-4 overflow-hidden rounded-xl border border-hairline">
          <button
            type="button"
            onClick={() => setCalendarOpen((open) => !open)}
            aria-expanded={calendarOpen}
            className="grid w-full grid-cols-2 text-left"
          >
            <span className="border-r border-hairline px-4 py-3">
              <span className="block text-[11px] font-semibold uppercase">Check-in</span>
              <span className="text-sm">
                {checkIn ? formatShortDate(checkIn) : "Add date"}
              </span>
            </span>
            <span className="px-4 py-3">
              <span className="block text-[11px] font-semibold uppercase">Check-out</span>
              <span className="text-sm">
                {checkOut ? formatShortDate(checkOut) : "Add date"}
              </span>
            </span>
          </button>
          <div className="flex items-center justify-between border-t border-hairline px-4 py-3">
            <div>
              <span className="block text-[11px] font-semibold uppercase">Guests</span>
              <span className="text-sm">
                {guests} guest{guests > 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Fewer guests"
                onClick={() => setGuests((value) => Math.max(1, value - 1))}
                disabled={guests <= 1}
                className="grid h-7 w-7 place-items-center rounded-full border border-hairline text-muted disabled:opacity-40 enabled:hover:border-ink enabled:hover:text-ink"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="More guests"
                onClick={() => setGuests((value) => Math.min(listing.max_guests, value + 1))}
                disabled={guests >= listing.max_guests}
                className="grid h-7 w-7 place-items-center rounded-full border border-hairline text-muted disabled:opacity-40 enabled:hover:border-ink enabled:hover:text-ink"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Interactive calendar; booked nights are greyed out and unclickable. */}
        {calendarOpen && (
          <div className="mt-3 rounded-xl border border-hairline">
            <DateRangeCalendar
              bookedRanges={listing.booked_dates}
              checkIn={checkIn}
              checkOut={checkOut}
              onChange={({ checkIn: nextIn, checkOut: nextOut }) => {
                setCheckIn(nextIn);
                setCheckOut(nextOut);
                // Collapse once a full range is chosen.
                if (nextIn && nextOut) setCalendarOpen(false);
              }}
            />
          </div>
        )}

        {validationError && (
          <p className="mt-3 text-xs text-rausch">{validationError}</p>
        )}

        <button
          type="button"
          onClick={() => setCheckoutOpen(true)}
          disabled={!canReserve}
          className="mt-4 w-full rounded-xl bg-rausch py-3.5 text-base font-semibold text-white transition-colors hover:bg-rausch-dark disabled:cursor-not-allowed disabled:bg-hairline disabled:text-muted"
        >
          Reserve
        </button>
        <p className="mt-3 text-center text-xs text-muted">
          You won&apos;t be charged yet (mocked checkout)
        </p>

        {/* Price breakdown */}
        {nights > 0 && (
          <div className="mt-5 space-y-2 border-t border-hairline-soft pt-5 text-sm">
            <Row
              label={`${formatPrice(listing.price_per_night)} × ${nights} nights`}
              value={formatPrice(pricing.subtotal)}
            />
            <Row label="Cleaning fee" value={formatPrice(listing.cleaning_fee)} />
            <Row label="Service fee" value={formatPrice(listing.service_fee)} />
            <div className="flex justify-between border-t border-hairline-soft pt-3 font-semibold">
              <span>Total</span>
              <span>{formatPrice(pricing.total)}</span>
            </div>
          </div>
        )}
      </div>

      {checkoutOpen && (
        <CheckoutModal
          listing={listing}
          checkIn={checkIn}
          checkOut={checkOut}
          nights={nights}
          guests={guests}
          subtotal={pricing.subtotal}
          total={pricing.total}
          submitting={submitting}
          error={submitError}
          onClose={() => setCheckoutOpen(false)}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-ink/90">
      <span className="underline decoration-hairline">{label}</span>
      <span>{value}</span>
    </div>
  );
}

/** Mocked checkout: shows the itemized stay and creates the booking. */
function CheckoutModal({
  listing,
  checkIn,
  checkOut,
  nights,
  guests,
  subtotal,
  total,
  submitting,
  error,
  onClose,
  onConfirm,
}: {
  listing: ListingDetail;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  subtotal: number;
  total: number;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
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
        aria-label="Confirm and reserve"
        className="w-full max-w-md rounded-2xl bg-canvas p-6 shadow-modal"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Confirm and reserve</h2>
            <p className="text-sm text-muted">
              {listing.city}, {listing.country}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 rounded-xl border border-hairline-soft p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Dates</span>
            <span>
              {formatShortDate(checkIn)} – {formatShortDate(checkOut)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Guests</span>
            <span>
              {guests} guest{guests > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">
              {formatPrice(listing.price_per_night)} × {nights} nights
            </span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Cleaning fee</span>
            <span>{formatPrice(listing.cleaning_fee)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Service fee</span>
            <span>{formatPrice(listing.service_fee)}</span>
          </div>
          <div className="flex justify-between border-t border-hairline-soft pt-3 font-semibold">
            <span>Total (USD)</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-rausch">{error}</p>}

        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          className="mt-5 w-full rounded-xl bg-rausch py-3.5 font-semibold text-white transition-colors hover:bg-rausch-dark disabled:opacity-60"
        >
          {submitting ? "Reserving…" : "Confirm and reserve"}
        </button>
        <p className="mt-3 text-center text-xs text-muted">
          Payments are mocked — no card is charged.
        </p>
      </div>
    </div>
  );
}

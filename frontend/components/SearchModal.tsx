"use client";

import { Minus, Plus, Search, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useSearch } from "@/context/SearchContext";
import { nightsBetween, todayISO } from "@/lib/format";

const POPULAR_CITIES = [
  "Malibu",
  "New York",
  "Lake Tahoe",
  "Santorini",
  "Paris",
  "Aspen",
  "Whistler",
  "Cape Town",
];

/**
 * Airbnb's search popover. It edits a local "draft" copy of the filters and
 * only commits them to the shared SearchContext when the user hits Search, so
 * typing/closing doesn't refetch the grid on every keystroke.
 */
export function SearchModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { filters, applyFilters, reset } = useSearch();

  const [city, setCity] = useState(filters.city);
  const [checkIn, setCheckIn] = useState(filters.checkIn);
  const [checkOut, setCheckOut] = useState(filters.checkOut);
  const [guests, setGuests] = useState(filters.guests);

  // Re-sync the draft whenever the modal is reopened.
  useEffect(() => {
    if (open) {
      setCity(filters.city);
      setCheckIn(filters.checkIn);
      setCheckOut(filters.checkOut);
      setGuests(filters.guests);
    }
  }, [open, filters]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const nights = nightsBetween(checkIn, checkOut);
  const datesInvalid = Boolean(checkIn && checkOut && nights <= 0);

  const handleSearch = () => {
    if (datesInvalid) return;
    applyFilters({ city, checkIn, checkOut, guests });
    onClose();
  };

  const handleClear = () => {
    setCity("");
    setCheckIn("");
    setCheckOut("");
    setGuests(0);
    reset();
  };

  const adjustGuests = (delta: number) => {
    setGuests((current) => Math.max(0, Math.min(16, current + delta)));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-20"
      onMouseDown={(event) => {
        // Close only when the backdrop itself is clicked.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search stays"
        className="w-full max-w-3xl rounded-3xl bg-canvas p-6 shadow-modal"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Search</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Where */}
        <section className="mb-4">
          <label className="mb-2 block text-sm font-semibold" htmlFor="search-where">
            Where
          </label>
          <input
            id="search-where"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Search destinations"
            className="w-full rounded-xl border border-hairline bg-canvas px-4 py-3 text-sm outline-none focus:border-ink"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {POPULAR_CITIES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCity(option)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  city === option
                    ? "border-ink bg-ink text-white"
                    : "border-hairline text-muted hover:border-ink hover:text-ink"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </section>

        {/* When */}
        <section className="mb-4">
          <p className="mb-2 text-sm font-semibold">When</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-hairline px-4 py-3">
              <label className="block text-xs font-medium text-muted" htmlFor="search-checkin">
                Check in
              </label>
              <input
                id="search-checkin"
                type="date"
                min={todayISO()}
                value={checkIn}
                onChange={(event) => setCheckIn(event.target.value)}
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
            <div className="rounded-xl border border-hairline px-4 py-3">
              <label className="block text-xs font-medium text-muted" htmlFor="search-checkout">
                Check out
              </label>
              <input
                id="search-checkout"
                type="date"
                min={checkIn || todayISO()}
                value={checkOut}
                onChange={(event) => setCheckOut(event.target.value)}
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>
          {datesInvalid && (
            <p className="mt-2 text-xs text-rausch">
              Check-out must be after check-in.
            </p>
          )}
        </section>

        {/* Who */}
        <section className="mb-6">
          <p className="mb-2 text-sm font-semibold">Who</p>
          <div className="flex items-center justify-between rounded-xl border border-hairline px-4 py-3">
            <div>
              <p className="text-sm font-medium">Guests</p>
              <p className="text-xs text-muted">
                {guests > 0 ? `${guests} guest${guests > 1 ? "s" : ""}` : "Any number of guests"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => adjustGuests(-1)}
                disabled={guests <= 0}
                aria-label="Fewer guests"
                className="grid h-8 w-8 place-items-center rounded-full border border-hairline text-muted disabled:opacity-40 enabled:hover:border-ink enabled:hover:text-ink"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-5 text-center text-sm">{guests}</span>
              <button
                type="button"
                onClick={() => adjustGuests(1)}
                disabled={guests >= 16}
                aria-label="More guests"
                className="grid h-8 w-8 place-items-center rounded-full border border-hairline text-muted disabled:opacity-40 enabled:hover:border-ink enabled:hover:text-ink"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-hairline-soft pt-4">
          <button
            type="button"
            onClick={handleClear}
            className="text-sm font-semibold underline"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={handleSearch}
            disabled={datesInvalid}
            className="flex items-center gap-2 rounded-xl bg-rausch px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-rausch-dark disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
        </div>
      </div>
    </div>
  );
}

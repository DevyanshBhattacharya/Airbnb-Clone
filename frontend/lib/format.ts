/** Small formatting helpers shared across components. */

/** Format a number as whole-dollar USD, e.g. 620 -> "$620". */
export function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Turn an ISO date string ("2026-10-12") into a short label ("Oct 12"). */
export function formatShortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Turn an ISO date string into a long label ("October 2026"). */
export function formatLongDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/**
 * Month/year label for a full ISO *datetime* (as returned for review/booking
 * `created_at`). Handles both date-only and datetime inputs.
 */
export function formatMonthYear(iso: string): string {
  const date = iso.includes("T") ? new Date(iso) : new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Today as a yyyy-mm-dd string, suitable for an <input type="date"> min. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Whole nights between two ISO dates (0 if either is missing or invalid). */
export function nightsBetween(checkIn?: string, checkOut?: string): number {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(`${checkIn}T00:00:00`).getTime();
  const end = new Date(`${checkOut}T00:00:00`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

/**
 * Does [checkIn, checkOut) overlap any booked range? Mirrors the backend rule
 * (strict `<`) so the calendar and the server never disagree.
 */
export function overlapsBooked(
  checkIn: string,
  checkOut: string,
  booked: { check_in: string; check_out: string }[]
): boolean {
  return booked.some((range) => checkIn < range.check_out && range.check_in < checkOut);
}

/** "2026-10-12" -> Date at local midnight (avoids UTC off-by-one). */
export function parseISODate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** Add days to an ISO date and return a new ISO date. */
export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Build a compact search-pill summary from the active filters. */
export function describeSearch(city: string, checkIn: string, checkOut: string, guests: number): {
  where: string;
  when: string;
  who: string;
} {
  return {
    where: city || "Anywhere",
    when:
      checkIn && checkOut
        ? `${formatShortDate(checkIn)} – ${formatShortDate(checkOut)}`
        : "Any week",
    who: guests > 0 ? `${guests} guest${guests > 1 ? "s" : ""}` : "Add guests",
  };
}

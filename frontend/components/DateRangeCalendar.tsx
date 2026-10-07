"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { todayISO } from "@/lib/format";
import type { DateRange } from "@/lib/types";

/**
 * A single-month date-range picker that greys out nights that are already
 * booked.
 *
 * Booked nights are the half-open interval [check_in, check_out): the check-out
 * day is intentionally *not* blocked, so a new guest can check in the same day
 * the previous one leaves — the same rule the backend uses.
 */

const DAY_MS = 86_400_000;
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseISO(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** Every blocked night across the booked ranges, as ISO strings. */
function buildBlockedSet(ranges: DateRange[]): Set<string> {
  const blocked = new Set<string>();
  for (const range of ranges) {
    let cursor = parseISO(range.check_in);
    const end = parseISO(range.check_out);
    while (cursor < end) {
      blocked.add(toISO(cursor));
      cursor = new Date(cursor.getTime() + DAY_MS);
    }
  }
  return blocked;
}

/** Does [from, to) contain any blocked night? */
function rangeHasBlocked(from: string, to: string, blocked: Set<string>): boolean {
  let cursor = parseISO(from);
  const end = parseISO(to);
  while (cursor < end) {
    if (blocked.has(toISO(cursor))) return true;
    cursor = new Date(cursor.getTime() + DAY_MS);
  }
  return false;
}

export function DateRangeCalendar({
  bookedRanges,
  checkIn,
  checkOut,
  onChange,
}: {
  bookedRanges: DateRange[];
  checkIn: string;
  checkOut: string;
  onChange: (range: { checkIn: string; checkOut: string }) => void;
}) {
  const blocked = useMemo(() => buildBlockedSet(bookedRanges), [bookedRanges]);
  const today = todayISO();

  const [cursor, setCursor] = useState<Date>(() => {
    const base = checkIn ? parseISO(checkIn) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = cursor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const selectDay = (iso: string) => {
    // Start a fresh range if nothing is selected or a full range already is.
    if (!checkIn || (checkIn && checkOut)) {
      onChange({ checkIn: iso, checkOut: "" });
      return;
    }
    // Clicking on/before check-in restarts the range.
    if (iso <= checkIn) {
      onChange({ checkIn: iso, checkOut: "" });
      return;
    }
    // A range that would span a booked night restarts from the clicked day.
    if (rangeHasBlocked(checkIn, iso, blocked)) {
      onChange({ checkIn: iso, checkOut: "" });
      return;
    }
    onChange({ checkIn, checkOut: iso });
  };

  const shiftMonth = (delta: number) => {
    setCursor(new Date(year, month + delta, 1));
  };

  return (
    <div className="p-1">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
          className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">{monthLabel}</span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
          className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {WEEKDAYS.map((day) => (
          <span key={day} className="py-1">
            {day}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {/* Leading blanks so the 1st lands on the right weekday. */}
        {Array.from({ length: firstWeekday }).map((_, index) => (
          <span key={`blank-${index}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, index) => {
          const dayNumber = index + 1;
          const iso = toISO(new Date(year, month, dayNumber));
          const isBlocked = blocked.has(iso);
          const isPast = iso < today;
          const disabled = isBlocked || isPast;

          const isStart = iso === checkIn;
          const isEnd = iso === checkOut;
          const inRange =
            Boolean(checkIn) &&
            Boolean(checkOut) &&
            iso > checkIn &&
            iso < checkOut;

          let classes =
            "relative h-9 w-9 rounded-full text-sm transition-colors ";
          if (disabled) {
            // Booked nights read as crossed-out; past days are simply muted.
            classes += isBlocked
              ? "cursor-not-allowed text-muted-soft line-through"
              : "cursor-not-allowed text-muted-soft";
          } else if (isStart || isEnd) {
            classes += "bg-ink text-white";
          } else if (inRange) {
            classes += "bg-surface text-ink";
          } else {
            classes += "hover:bg-surface";
          }

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => selectDay(iso)}
              aria-label={iso}
              aria-disabled={disabled}
              title={isBlocked ? "Already booked" : iso}
              className={classes}
            >
              {dayNumber}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-4 border-t border-hairline-soft pt-3 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border border-hairline" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-hairline-soft" />
          Booked
        </span>
      </div>
    </div>
  );
}

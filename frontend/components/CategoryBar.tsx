"use client";

import {
  Building2,
  CloudSun,
  Crown,
  Droplets,
  Grid2x2,
  House,
  Mountain,
  Tent,
  Trees,
  TrendingUp,
  Waves,
} from "lucide-react";
import type { ComponentType } from "react";

import { useSearch } from "@/context/SearchContext";

/**
 * Airbnb's horizontal category bar. The categories match the ones present in
 * the seed data so every tab returns results. Clicking one filters the grid;
 * the icons are Lucide and the row scrolls horizontally without a scrollbar.
 */
const CATEGORIES: { label: string; icon: ComponentType<{ className?: string }> }[] = [
  { label: "All", icon: Grid2x2 },
  { label: "Beachfront", icon: Waves },
  { label: "Cabins", icon: Trees },
  { label: "Iconic cities", icon: Building2 },
  { label: "Tiny homes", icon: House },
  { label: "Lakefront", icon: Droplets },
  { label: "Amazing views", icon: Mountain },
  { label: "Countryside", icon: CloudSun },
  { label: "Luxe", icon: Crown },
  { label: "Off-the-grid", icon: Tent },
  { label: "Trending", icon: TrendingUp },
];

export function CategoryBar() {
  const { filters, setCategory } = useSearch();

  return (
    <div className="sticky top-16 z-30 border-b border-hairline-soft bg-canvas">
      <div className="no-scrollbar mx-auto flex max-w-7xl items-center gap-8 overflow-x-auto px-6 py-3">
        {CATEGORIES.map(({ label, icon: Icon }) => {
          const value = label === "All" ? "" : label;
          const active = filters.category === value;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setCategory(value)}
              className={`group flex shrink-0 flex-col items-center gap-1.5 border-b-2 pb-2 pt-1 text-xs font-medium transition-colors ${
                active
                  ? "border-ink text-ink"
                  : "border-transparent text-muted hover:border-hairline hover:text-ink"
              }`}
              aria-pressed={active}
            >
              <Icon className="h-6 w-6" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

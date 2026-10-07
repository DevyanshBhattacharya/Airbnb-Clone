"use client";

/**
 * Shared marketplace search state.
 *
 * The search pill lives in the global Navbar while the results grid lives on
 * the home page, so the active filters have to be shared across the tree. A
 * context is the smallest thing that does that cleanly.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface SearchFilters {
  city: string;
  checkIn: string; // ISO date or ""
  checkOut: string; // ISO date or ""
  guests: number; // 0 means "any"
  category: string; // "" means "All"
}

const EMPTY_FILTERS: SearchFilters = {
  city: "",
  checkIn: "",
  checkOut: "",
  guests: 0,
  category: "",
};

interface SearchContextValue {
  filters: SearchFilters;
  /** Merge a partial update into the active filters. */
  applyFilters: (patch: Partial<SearchFilters>) => void;
  /** Set just the category (used by the category bar). */
  setCategory: (category: string) => void;
  clearDates: () => void;
  reset: () => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);

  const applyFilters = useCallback((patch: Partial<SearchFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
  }, []);

  const value = useMemo<SearchContextValue>(
    () => ({
      filters,
      applyFilters,
      setCategory: (category) => applyFilters({ category }),
      clearDates: () => applyFilters({ checkIn: "", checkOut: "" }),
      reset: () => setFilters(EMPTY_FILTERS),
    }),
    [filters, applyFilters]
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch(): SearchContextValue {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used inside <SearchProvider>");
  }
  return context;
}

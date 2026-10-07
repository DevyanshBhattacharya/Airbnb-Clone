import { Suspense } from "react";

import { ListingRoute } from "@/components/ListingRoute";

/**
 * Dynamic listing route.
 *
 * The URL param is read with `useParams` inside <ListingRoute>, which must sit
 * under a <Suspense> boundary because Cache Components prerenders a static
 * shell before URL data exists.
 */
export default function ListingPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-6 py-24 text-center text-muted">
          Loading listing…
        </div>
      }
    >
      <ListingRoute />
    </Suspense>
  );
}

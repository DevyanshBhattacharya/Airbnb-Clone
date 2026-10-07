"use client";

import { LeafletMap } from "@/components/LeafletMap";

/**
 * Location map for a single listing. Renders one price-pill marker (Leaflet)
 * with a small overlay card showing where the home is.
 */
export function ListingMap({
  id,
  title,
  price,
  image,
  latitude,
  longitude,
  location,
  city,
}: {
  id: number;
  title: string;
  price: number;
  image: string | null;
  latitude: number;
  longitude: number;
  location: string;
  city: string;
}) {
  return (
    <div className="relative h-[360px] overflow-hidden rounded-2xl border border-hairline-soft">
      <LeafletMap
        single
        markers={[{ id, title, price, image, latitude, longitude, city }]}
      />
      <div className="pointer-events-none absolute left-4 top-4 z-[500] rounded-xl bg-canvas px-4 py-3 shadow-card">
        <p className="text-sm font-semibold">{location}</p>
        <p className="text-xs text-muted">{city}</p>
      </div>
    </div>
  );
}
